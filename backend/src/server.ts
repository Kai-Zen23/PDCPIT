import express from "express";
import compression from "compression";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import { z } from "zod";
import { Worker } from "worker_threads";
import path from "path";
import { fileURLToPath } from "url";

import type { ClientToServerEvents, ServerToClientEvents } from "./types.js";
import { createMatchSchema, joinMatchSchema, matchCommandSchema, powerUpPayloadSchema, type MatchEvent } from "./types.js";
import { commandDraw, commandPowerUp, commandStand, commandReady, startNextRound, startMatch } from "./engine.js";
import {
  bindSocket,
  createNewMatch,
  getMatch,
  joinExistingMatch,
  findWaitingMatchId,
  listActiveMatchIds,
  listWaitingMatchIds,
  maybeAdvanceAfterRound,
  updateMatchState,
  unbindSocket,
  getQueueCount,
  clearWaitingMatch,
  getExpiredMatches,
  MatchRecord,
  saveRecord,
  acquireMatchLock,
  releaseMatchLock,
  injectAiIntoMatch,
} from "./store.js";
import { viewForPlayer } from "./view.js";
import { expressLatencyMiddleware } from "./metrics.js";

const PORT = Number(process.env.PORT ?? 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";

// Resolve production build file path dynamically for pure ESM execution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const botWorkerPath = path.resolve(__dirname, "./botWorker.js");

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function buildAllowedOrigins(raw: string): Set<string> {
  if (raw.trim() === "*") return new Set(["*"]);
  return new Set(
    raw
      .split(",")
      .map((v) => normalizeOrigin(v))
      .filter(Boolean),
  );
}

const allowedOrigins = buildAllowedOrigins(CORS_ORIGIN);
const allowAllOrigins = allowedOrigins.has("*");

const app = express();

// OPTIMIZATIONS: Compression + Performance Monitoring
app.use(compression());
app.use(expressLatencyMiddleware());

app.use(express.json());
app.use(
  cors({
    origin(origin, cb) {
      // Allow non-browser and same-origin requests with no Origin header.
      if (!origin || allowAllOrigins) return cb(null, true);
      const normalized = normalizeOrigin(origin);
      if (allowedOrigins.has(normalized)) return cb(null, true);
      return cb(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  }),
);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/api/matchmaking/status", async (_req, res) => {
  try {
    const count = await getQueueCount();
    const active = await listActiveMatchIds();
    res.json({ waitingCount: count, activeCount: active.length });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch status" });
  }
});

// findWaitingMatchId is now moved to store.ts for better Redis efficiency

app.post("/api/matches", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { matchId, playerId } = await createNewMatch(parsed.data.playerName, parsed.data.isPrivate);
  return res.json({ matchId, playerId });
});

app.post("/api/matchmaking/enqueue", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const playerName = parsed.data.playerName;
  try {
    console.log(`[Matchmaking] Enqueue request from: ${playerName}`);
    const waitingMatchId = await findWaitingMatchId();
    if (waitingMatchId) {
      try {
        console.log(`[Matchmaking] Attempting to join existing match: ${waitingMatchId}`);
        const { playerId } = await joinExistingMatch(waitingMatchId, playerName);
        io.to(room(waitingMatchId)).emit("match:event", { type: "MATCH:STARTED", matchId: waitingMatchId });
        await emitState(waitingMatchId);
        console.log(`[Matchmaking] Successfully joined ${waitingMatchId} as ${playerId}`);
        return res.json({ matchId: waitingMatchId, playerId, role: "JOINED" as const });
      } catch (e) {
        console.warn(`[Matchmaking] Race condition/Failure: Failed to join ${waitingMatchId}. Falling back.`);
      }
    }

    const created = await createNewMatch(playerName);
    console.log(`[Matchmaking] Created new match: ${created.matchId} for ${created.playerId}`);
    return res.json({ matchId: created.matchId, playerId: created.playerId, role: "CREATED" as const });
  } catch (e) {
    console.error(`[Matchmaking] Fatal error:`, e);
    return res.status(400).json({ error: e instanceof Error ? e.message : "Matchmaking failed" });
  }
});

app.post("/api/matches/:matchId/join", async (req, res) => {
  const matchId = String(req.params.matchId ?? "").trim();
  const parsed = joinMatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const { playerId } = await joinExistingMatch(matchId, parsed.data.playerName);
    // Real-time update: broadcast to everyone in the room that the guest joined
    io.to(room(matchId)).emit("match:event", { type: "MATCH:STARTED", matchId });
    await emitState(matchId);
    return res.json({ matchId, playerId });
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : "Join failed" });
  }
});

app.get("/api/matches/:matchId/state/:playerId", async (req, res) => {
  const matchId = String(req.params.matchId ?? "").trim();
  const playerId = String(req.params.playerId ?? "").trim();
  const record = await getMatch(matchId);
  if (!record) return res.status(404).json({ error: "Match not found" });
  try {
    return res.json(viewForPlayer(record.match, playerId));
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : "Bad request" });
  }
});

const server = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin(origin, cb) {
      if (!origin || allowAllOrigins) return cb(null, true);
      const normalized = normalizeOrigin(origin);
      if (allowedOrigins.has(normalized)) return cb(null, true);
      return cb(new Error("origin not allowed"), false);
    },
    credentials: true,
  },
  // Resiliency Tuning: Drop disconnected sockets quickly across clustered adapters
  pingInterval: 10000,
  pingTimeout: 5000,
});

// REDIS ADAPTER for multi-server synchronization
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const pubClient = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
const subClient = pubClient.duplicate();

// Defensive error handling for adapter clients
pubClient.on("error", (err) => console.error("[Redis Pub Error]", err));
subClient.on("error", (err) => console.error("[Redis Sub Error]", err));

io.adapter(createAdapter(pubClient, subClient));


function room(matchId: string) {
  return `match:${matchId}`;
}

function playerRoom(playerId: string) {
  return `user:${playerId}`;
}

async function emitState(matchId: string, existingRecord?: MatchRecord, patchDiff?: { type: string; payload?: any }) {
  const record = existingRecord || (await getMatch(matchId));
  if (!record) return;

  // HYBRID SOCKET STRATEGY:
  // Broadcast differential low-latency patch fragments directly through local node cluster memory queues (`io.local`)
  // to ensure uncompromised UI responsiveness. Full deterministic projection updates sync globally via standard multi-node adapter topologies.
  for (const playerId of record.match.playerOrder) {
    const pRoom = playerRoom(playerId);
    if (patchDiff) {
      io.local.to(pRoom).emit("match:patch", { patch: patchDiff, stateHash: record.match.id });
    }
    io.to(pRoom).emit("match:state", viewForPlayer(record.match, playerId));
  }
}


// ---- PARTITION / SHARD MATCHES: Lock-Minimized Action Queue Engine
// Matches are horizontally sharded by matchId into isolated, sticky in-memory processing rings per cluster node.
// Eliminates multi-instance lock contention entirely by queuing commands sequentially within localized container maps.
interface QueuedCommand {
  socket: any;
  raw: any;
}

const matchQueues = new Map<string, QueuedCommand[]>();
const matchProcessing = new Set<string>();

function enqueueCommand(matchId: string, socket: any, raw: any) {
  if (!matchQueues.has(matchId)) {
    matchQueues.set(matchId, []);
  }
  matchQueues.get(matchId)!.push({ socket, raw });
  processNextCommand(matchId);
}

async function processNextCommand(matchId: string) {
  if (matchProcessing.has(matchId)) return;
  const q = matchQueues.get(matchId);
  if (!q || q.length === 0) return;

  matchProcessing.add(matchId);
  const cmd = q.shift()!;
  const socket = cmd.socket;
  const raw = cmd.raw;

  try {
    const parsed = matchCommandSchema.safeParse(raw);
    if (!parsed.success) {
      socket.emit("match:error", { message: "Invalid command payload." });
      return;
    }

    const { playerId, commandId, type, payload } = parsed.data;
    const record = await getMatch(matchId);
    if (!record) {
      socket.emit("match:error", { commandId, message: "Match not found." });
      return;
    }

    // Security: Ensure the player is actually in this match
    if (!record.match.players[playerId]) {
      socket.emit("match:error", { commandId, message: "You are not a player in this match." });
      return;
    }

    let events: MatchEvent[] = [];
    if (type === "DRAW") events = commandDraw(record.match, playerId);
    else if (type === "STAND") events = commandStand(record.match, playerId);
    else if (type === "READY") {
      console.log(`[Command Received] READY from player ${playerId} for match ${matchId}`);
      events = commandReady(record.match, playerId);
      const readiedCount = Object.values(record.match.readyStatus).filter(Boolean).length;
      console.log(`[Command Processed] READY from player ${playerId}. Total ready: ${readiedCount}`);
    } else if (type === "NEXT_ROUND") {
      events = startNextRound(record.match);
    } else {
      const pParsed = powerUpPayloadSchema.safeParse(payload);
      if (!pParsed.success) throw new Error("Invalid power-up payload.");
      events = commandPowerUp(record.match, playerId, pParsed.data);
    }

    for (const ev of events) io.to(room(matchId)).emit("match:event", ev);

    // Optimized: Direct database serialization
    await saveRecord(record);
    await maybeAdvanceAfterRound(record);
    await emitState(matchId, record, { type, payload });
  } catch (e) {
    console.error(`[Command Error]:`, e);
    const parsed = matchCommandSchema.safeParse(raw);
    const commandId = parsed.success ? parsed.data.commandId : undefined;
    socket.emit("match:error", { commandId, message: e instanceof Error ? e.message : "Command failed." });
  } finally {
    matchProcessing.delete(matchId);
    // Process next action in buffer synchronously via event loop drain
    if (q.length > 0) {
      setImmediate(() => processNextCommand(matchId));
    } else {
      matchQueues.delete(matchId);
    }
  }
}


io.on("connection", (socket) => {
  socket.on("match:join", async ({ matchId, playerId }) => {
    const record = await getMatch(matchId);
    if (!record) {
      socket.emit("match:error", { message: "Match not found." });
      return;
    }
    if (!record.match.players[playerId]) {
      socket.emit("match:error", { message: "Unknown player." });
      return;
    }

    // Tag the socket for easier identification
    (socket as any).playerId = playerId;
    (socket as any).matchId = matchId;

    socket.join(room(matchId));
    socket.join(playerRoom(playerId)); // Join private room for cross-server emits
    await bindSocket(matchId, playerId, socket.id);

    
    // Send immediate state
    socket.emit("match:state", viewForPlayer(record.match, playerId));
    
    // Sync other players
    await emitState(matchId);
    console.log(`[Socket] Player ${playerId} joined match ${matchId}`);
  });

  socket.on("round:command", (raw) => {
    const parsed = matchCommandSchema.safeParse(raw);
    if (parsed.success) {
      enqueueCommand(parsed.data.matchId, socket, raw);
    } else {
      socket.emit("match:error", { message: "Invalid command payload structure." });
    }
  });

  socket.on("disconnect", async () => {
    const mId = (socket as any).matchId;
    const pId = (socket as any).playerId;
    if (mId && pId) {
      console.log(`[Socket] Player ${pId} disconnected from match ${mId}`);
      await unbindSocket(mId, pId, socket.id);
      
      // GHOST CLEANUP: If the match was still WAITING with only 1 player, remove it from queue
      const record = await getMatch(mId);
      if (record && record.match.status === "WAITING" && record.match.playerOrder.length === 1) {
        console.log(`[Matchmaking] Cleaning up ghost match ${mId} (creator disconnected)`);
        await clearWaitingMatch(mId);
      }
    }
  });
});

// ---- Turn Timer Logic (15s timeout)
const TURN_TIMEOUT_MS = 15000;
setInterval(async () => {
  const now = Date.now();

  // --- 1. EVALUATE AI BOT AUTO-QUEUE INJECTIONS ---
  try {
    const waitingIds = await listWaitingMatchIds();
    await Promise.allSettled(
      waitingIds.map(async (matchId) => {
        const lockAcquired = await acquireMatchLock(`ai_inject:${matchId}`, 500);
        if (!lockAcquired) return;
        try {
          const record = await getMatch(matchId);
          if (!record || record.match.status !== "WAITING") return;
          
          // If single player public match stalled for > 60 seconds
          if (record.match.playerOrder.length === 1 && !record.match.isPrivate) {
            if (now - record.match.createdAt > 60000) {
              console.log(`[AI Bot] Triggering autonomous AI Bot insertion for stale queue match: ${matchId}`);
              const result = await injectAiIntoMatch(matchId);
              if (result) {
                io.to(room(matchId)).emit("match:event", { type: "MATCH:STARTED", matchId });
                for (const ev of result.events) {
                  io.to(room(matchId)).emit("match:event", ev);
                }
                await emitState(matchId);
              }
            }
          }
        } finally {
          await releaseMatchLock(`ai_inject:${matchId}`);
        }
      })
    );
  } catch (err) {
    // silently continue
  }

  // --- 2. EVALUATE LIVE BOT GAMEPLAY HEURISTICS ---
  try {
    const activeIds = await listActiveMatchIds();
    await Promise.allSettled(
      activeIds.map(async (matchId) => {
        const record = await getMatch(matchId);
        if (!record || record.match.status !== "IN_PROGRESS" || !record.match.round || record.match.round.ended) return;
        
        const activePid = record.match.round.activePlayerId;
        const activePlayer = record.match.players[activePid];
        if (!activePlayer?.isBot) return;

        // Ensure Bot mimics human pacing with a 2.5-second processing delay
        if (now - record.match.round.turnStartedAt < 2500) return;

        // Distributed safety: guarantee Bot turn executes on exactly one cluster worker
        const lockAcquired = await acquireMatchLock(`bot_turn:${matchId}:${record.match.round.roundNumber}:${record.match.round.turnStartedAt}`, 500);
        if (!lockAcquired) return;

        try {
          const { match } = record;
          const round = match.round!;
          const botState = round.players[activePid]!;
          
          // Sum values: hidden cards are fully visible to server logic
          const myTotal = botState.hand.reduce((acc, c) => acc + c.value, 0);
          
          // Find opponent visible total
          const oppPid = match.playerOrder.find(p => p !== activePid)!;
          const oppState = round.players[oppPid];
          const oppVisibleTotal = oppState?.hand.filter(c => c.visibility === "VISIBLE").reduce((acc, c) => acc + c.value, 0) || 0;

          // Offload heuristic target calculation fully to independent non-blocking worker thread
          const decision: { type: "DRAW" | "STAND" | "POWER_UP"; payload?: any } = await new Promise((resolve, reject) => {
            const worker = new Worker(botWorkerPath);
            worker.once("message", (msg) => {
              resolve(msg);
              worker.terminate().catch(() => {});
            });
            worker.once("error", (err) => {
              reject(err);
              worker.terminate().catch(() => {});
            });
            worker.postMessage({
              matchId,
              botId: activePid,
              botTotal: myTotal,
              oppVisibleTotal,
              target: round.target,
              powerUps: activePlayer.powerUps,
              handCount: botState.hand.length,
              oppHandCount: oppState?.hand.length || 0
            });
          });

          let events: MatchEvent[] = [];
          if (decision.type === "POWER_UP") {
            events = commandPowerUp(match, activePid, decision.payload);
          } else if (decision.type === "STAND") {
            events = commandStand(match, activePid);
          } else {
            events = commandDraw(match, activePid);
          }

          console.log(`[AI Bot Worker Thread] Computed turn for Bot ${activePid} in match ${matchId}. Action: ${decision.type}`);
          for (const ev of events) io.to(room(matchId)).emit("match:event", ev);
          await saveRecord(record);
          await maybeAdvanceAfterRound(record);
          await emitState(matchId, record, { type: decision.type, payload: decision.payload });
        } catch (err) {
          console.error(`[AI Bot Turn Error]`, err);
        }
      })
    );
  } catch (err) {
    // silently continue
  }

  // --- 3. EXISTING EXPIRED TIMEOUT CHECKS ---
  const expiredIds = await getExpiredMatches(now);
  
  await Promise.allSettled(
    expiredIds.map(async (matchId) => {
      // Optimized lock TTL down to 500ms to allow sub-second background task handover
      const lockAcquired = await acquireMatchLock(matchId, 500);
      if (!lockAcquired) return;

      try {
        const record = await getMatch(matchId);
        if (!record) {
          await clearWaitingMatch(matchId);
          return;
        }
        const { match } = record;

        if (match.status === "WAITING" && match.readyCountdownExpiresAt && now > match.readyCountdownExpiresAt) {
          console.log(`[Timer] Ready-up timeout for match ${matchId}. Terminating.`);
          match.status = "FINISHED";
          match.winnerPlayerId = null;
          match.readyCountdownExpiresAt = null;
          
          io.to(room(matchId)).emit("match:error", { 
            message: "Neural sync failed: Authentication window expired. Returning to hub." 
          });

          await saveRecord(record);
          await emitState(matchId, record);
          return;
        }

        if (match.status === "IN_PROGRESS" && match.round && !match.round.ended) {
          const activePlayerId = match.round.activePlayerId;
          console.log(`[Timer] Timeout for match ${matchId} (active: ${activePlayerId})`);
          try {
            const events = commandDraw(match, activePlayerId);
            for (const ev of events) io.to(room(matchId)).emit("match:event", ev);
            await saveRecord(record);
            await maybeAdvanceAfterRound(record);
            await emitState(matchId, record);
          } catch (e) {
            try {
              const events = commandStand(match, activePlayerId);
              for (const ev of events) io.to(room(matchId)).emit("match:event", ev);
              await saveRecord(record);
              await maybeAdvanceAfterRound(record);
              await emitState(matchId, record);
            } catch (e2) {
              match.round.turnStartedAt = now;
              await updateMatchState(match);
              await emitState(matchId, record);
            }
          }
        }
      } finally {
        await releaseMatchLock(matchId);
      }
    })
  );
}, 1000);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on :${PORT}`);
});
