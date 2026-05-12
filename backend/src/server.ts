import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import { z } from "zod";


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
} from "./store.js";
import { viewForPlayer } from "./view.js";

const PORT = Number(process.env.PORT ?? 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";

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

async function emitState(matchId: string, existingRecord?: MatchRecord) {
  const record = existingRecord || (await getMatch(matchId));
  if (!record) return;

  // Optimized: Broadcast to private player rooms. 
  // This works across multiple server instances via the Redis Adapter.
  for (const playerId of record.match.playerOrder) {
    io.to(playerRoom(playerId)).emit("match:state", viewForPlayer(record.match, playerId));
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

  socket.on("round:command", async (raw) => {
    const parsed = matchCommandSchema.safeParse(raw);
    if (!parsed.success) {
      socket.emit("match:error", { message: "Invalid command payload." });
      return;
    }

    const { matchId, playerId, commandId, type, payload } = parsed.data;
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

    // Optional: could also verify socket is in room(matchId), but playerId check is stronger.

    // Concurrency Guard: Ensure events for the same match process in strict sequence per cluster node
    const lockAcquired = await acquireMatchLock(matchId, 2000);
    if (!lockAcquired) {
      socket.emit("match:error", { commandId, message: "Action stream highly active. Concurrency limit protected." });
      return;
    }

    try {
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
      
      // OPTIMIZATION: Save the record we already have and broadcast it immediately
      await saveRecord(record); 
      await maybeAdvanceAfterRound(record);
      await emitState(matchId, record);
    } catch (e) {
      console.error(`[Command Error] ${type}:`, e);
      socket.emit("match:error", { commandId, message: e instanceof Error ? e.message : "Command failed." });
    } finally {
      await releaseMatchLock(matchId);
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
  // PERFORMANCE FIX: Only fetch matches that are actually expired
  const expiredIds = await getExpiredMatches(now);
  
  // PARALLEL PROCESSING: Evaluate expired timeouts concurrently without blocking main Event Loop ticks
  await Promise.allSettled(
    expiredIds.map(async (matchId) => {
      // DISTRIBUTED MULTI-SERVER GUARD: Guarantee timeout evaluates on exactly one Nginx game server cluster instance
      const lockAcquired = await acquireMatchLock(matchId, 3000);
      if (!lockAcquired) return; // Handled by parallel sibling server

      try {
        const record = await getMatch(matchId);
        if (!record) {
          await clearWaitingMatch(matchId); // Cleanup index if record missing
          return;
        }
        const { match } = record;

        // 1. Ready Timeout check
        if (match.status === "WAITING" && match.readyCountdownExpiresAt && now > match.readyCountdownExpiresAt) {
          console.log(`[Timer] Ready-up timeout for match ${matchId}. Terminating.`);
          match.status = "FINISHED";
          match.winnerPlayerId = null; // No winner
          match.readyCountdownExpiresAt = null;
          
          io.to(room(matchId)).emit("match:error", { 
            message: "Neural sync failed: Authentication window expired. Returning to hub." 
          });

          await saveRecord(record);
          await emitState(matchId, record);
          return;
        }

        // Handle Round turn timeouts
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

