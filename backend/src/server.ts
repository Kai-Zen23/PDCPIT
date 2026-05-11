import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { z } from "zod";

import type { ClientToServerEvents, ServerToClientEvents } from "./types.js";
import { createMatchSchema, joinMatchSchema, matchCommandSchema, powerUpPayloadSchema, type MatchEvent } from "./types.js";
import { commandDraw, commandPowerUp, commandStand, commandReady, startNextRound } from "./engine.js";
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
  addBotToMatch,
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

// findWaitingMatchId is now moved to store.ts for better Redis efficiency

app.post("/api/matches", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { matchId, playerId } = await createNewMatch(parsed.data.playerName);
  return res.json({ matchId, playerId });
});

app.post("/api/matchmaking/enqueue", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const playerName = parsed.data.playerName;

  try {
    // Pair with any currently waiting 1-player match; otherwise create a new one.
    const waitingMatchId = await findWaitingMatchId();
    if (waitingMatchId) {
      const { playerId } = await joinExistingMatch(waitingMatchId, playerName);
      // KEY FIX: Immediately push the updated IN_PROGRESS state to Player 1's
      // already-connected socket. Without this, Player 1 is stuck on "Searching"
      // until Player 2's WebSocket happens to connect — a race condition.
      await emitState(waitingMatchId);
      return res.json({ matchId: waitingMatchId, playerId, role: "JOINED" as const });
    }

    const created = await createNewMatch(playerName);
    
    // BOT FALLBACK: If no one joins in 20 seconds, add a bot.
    setTimeout(async () => {
      const rec = await getMatch(created.matchId);
      if (rec && rec.match.playerOrder.length === 1) {
        await addBotToMatch(created.matchId);
        await emitState(created.matchId);
      }
    }, 20000);

    return res.json({ matchId: created.matchId, playerId: created.playerId, role: "CREATED" as const });
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : "Matchmaking failed" });
  }
});

app.post("/api/matches/:matchId/join", async (req, res) => {
  const matchId = String(req.params.matchId ?? "").trim();
  const parsed = joinMatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const { playerId } = await joinExistingMatch(matchId, parsed.data.playerName);
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
});

function room(matchId: string) {
  return `match:${matchId}`;
}

async function emitState(matchId: string) {
  const record = await getMatch(matchId);
  if (!record) return;

  // Primary: Emit to specifically bound socket IDs
  for (const playerId of record.match.playerOrder) {
    const socketId = record.socketsByPlayer.get(playerId);
    if (socketId) {
      const s = io.sockets.sockets.get(socketId);
      if (s) {
        try {
          s.emit("match:state", viewForPlayer(record.match, playerId));
          continue; // Successfully sent to primary socket
        } catch (e) { /* ignore */ }
      }
    }

    // Fallback: If primary socket is gone, find any socket in the room with this pId
    const roomName = room(matchId);
    const roomSockets = io.sockets.adapter.rooms.get(roomName);
    if (roomSockets) {
      for (const sId of roomSockets) {
        const s = io.sockets.sockets.get(sId);
        if (s && (s as any).playerId === playerId) {
          try {
            s.emit("match:state", viewForPlayer(record.match, playerId));
          } catch { /* ignore */ }
        }
      }
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

    try {
      let events: MatchEvent[] = [];
      if (type === "DRAW") events = commandDraw(record.match, playerId);
      else if (type === "STAND") events = commandStand(record.match, playerId);
      else if (type === "READY") {
        events = commandReady(record.match, playerId);
      } else if (type === "NEXT_ROUND") {
        events = startNextRound(record.match);
      } else {
        const pParsed = powerUpPayloadSchema.safeParse(payload);
        if (!pParsed.success) throw new Error("Invalid power-up payload.");
        events = commandPowerUp(record.match, playerId, pParsed.data);
      }

      for (const ev of events) io.to(room(matchId)).emit("match:event", ev);
      await maybeAdvanceAfterRound(record);
      await emitState(matchId);
    } catch (e) {
      socket.emit("match:error", { commandId, message: e instanceof Error ? e.message : "Command failed." });
    }
  });

  socket.on("disconnect", async () => {
    // Tagged sockets make this faster
    const mId = (socket as any).matchId;
    const pId = (socket as any).playerId;
    if (mId && pId) {
      await unbindSocket(mId, pId, socket.id);
    }
  });
});

// ---- Turn Timer Logic (15s timeout)
const TURN_TIMEOUT_MS = 15000;
setInterval(async () => {
  const now = Date.now();
  const activeIds = await listActiveMatchIds();
  
  for (const matchId of activeIds) {
    const record = await getMatch(matchId);
    if (!record) continue;
    const { match } = record;

    // 1. Ready Timeout check
    if (match.status === "WAITING" && match.readyCountdownExpiresAt && now > match.readyCountdownExpiresAt) {
      const bothReady = Object.values(match.readyStatus).every(Boolean);
      if (!bothReady) {
        match.status = "FINISHED";
        match.readyCountdownExpiresAt = null;
        io.to(room(matchId)).emit("match:error", { message: "Match terminated: One or more players failed to ready up." });
        await updateMatchState(match); 
        await emitState(matchId);
        continue;
      }
    }

    // 2. Turn check (Human Timeout OR Bot Action)
    if (match.status !== "IN_PROGRESS" || !match.round || match.round.ended) continue;

    const activePlayerId = match.round.activePlayerId;
    const activePlayer = match.players[activePlayerId];
    if (!activePlayer) continue;

    const isBot = !!activePlayer.isBot;
    const timeInTurn = now - match.round.turnStartedAt;

    // Bot Logic or Human Timeout
    if (isBot || timeInTurn > TURN_TIMEOUT_MS) {
      // Bots move after 2 seconds to feel natural
      if (isBot && timeInTurn < 2000) continue;

      console.log(`[Timer] ${isBot ? "Bot" : "Timeout"} action for ${matchId} (player: ${activePlayerId})`);
      
      try {
        let events: MatchEvent[] = [];
        
        if (isBot) {
          // Simple Bot Strategy:
          const roundP = match.round.players[activePlayerId];
          const total = roundP?.hand.reduce((sum, c) => sum + c.value, 0) || 0;
          
          if (total < 17 && (roundP?.turnsTaken || 0) < 3) {
            events = commandDraw(match, activePlayerId);
          } else {
            events = commandStand(match, activePlayerId);
          }
        } else {
          // Human Timeout: Try Draw, then Stand
          try {
            events = commandDraw(match, activePlayerId);
          } catch {
            events = commandStand(match, activePlayerId);
          }
        }

        for (const ev of events) io.to(room(matchId)).emit("match:event", ev);
        await maybeAdvanceAfterRound(record);
        await emitState(matchId);
      } catch (e) {
        // Fallback to prevent hang
        match.round.turnStartedAt = now;
        await updateMatchState(match);
        await emitState(matchId);
      }
    }
  }
}, 1000);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on :${PORT}`);
});

