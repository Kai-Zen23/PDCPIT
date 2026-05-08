import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { z } from "zod";

import type { ClientToServerEvents, ServerToClientEvents } from "./types.js";
import { createMatchSchema, joinMatchSchema, matchCommandSchema, powerUpPayloadSchema } from "./types.js";
import { commandDraw, commandPowerUp, commandStand } from "./engine.js";
import {
  bindSocket,
  createNewMatch,
  getMatch,
  joinExistingMatch,
  listMatches,
  maybeAdvanceAfterRound,
  unbindSocket,
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

// Simple global matchmaking queue for MVP (one waiting match at a time).
let waitingMatchId: string | null = null;

app.post("/api/matches", (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { matchId, playerId } = createNewMatch(parsed.data.playerName);
  return res.json({ matchId, playerId });
});

app.post("/api/matchmaking/enqueue", (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const playerName = parsed.data.playerName;

  try {
    // If we have a waiting match with 1 player, join it; otherwise create a new waiting match.
    if (waitingMatchId) {
      const record = getMatch(waitingMatchId);
      if (record && record.match.status === "WAITING" && record.match.playerOrder.length === 1) {
        const { playerId } = joinExistingMatch(waitingMatchId, playerName);
        const matchId = waitingMatchId;
        waitingMatchId = null;
        return res.json({ matchId, playerId, role: "JOINED" as const });
      }
      // stale queue
      waitingMatchId = null;
    }

    const created = createNewMatch(playerName);
    waitingMatchId = created.matchId;
    return res.json({ matchId: created.matchId, playerId: created.playerId, role: "CREATED" as const });
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : "Matchmaking failed" });
  }
});

app.post("/api/matches/:matchId/join", (req, res) => {
  const matchId = String(req.params.matchId ?? "").trim();
  const parsed = joinMatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const { playerId } = joinExistingMatch(matchId, parsed.data.playerName);
    return res.json({ matchId, playerId });
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : "Join failed" });
  }
});

app.get("/api/matches/:matchId/state/:playerId", (req, res) => {
  const matchId = String(req.params.matchId ?? "").trim();
  const playerId = String(req.params.playerId ?? "").trim();
  const record = getMatch(matchId);
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
      return cb("origin not allowed", false);
    },
    credentials: true,
  },
});

function room(matchId: string) {
  return `match:${matchId}`;
}

function emitState(matchId: string) {
  const record = getMatch(matchId);
  if (!record) return;
  for (const playerId of record.match.playerOrder) {
    const socketId = record.socketsByPlayer.get(playerId);
    if (!socketId) continue;
    const s = io.sockets.sockets.get(socketId);
    if (!s) continue;
    try {
      s.emit("match:state", viewForPlayer(record.match, playerId));
    } catch {
      // ignore
    }
  }
}

io.on("connection", (socket) => {
  socket.on("match:join", ({ matchId, playerId }) => {
    const record = getMatch(matchId);
    if (!record) {
      socket.emit("match:error", { message: "Match not found." });
      return;
    }
    if (!record.match.players[playerId]) {
      socket.emit("match:error", { message: "Unknown player." });
      return;
    }
    socket.join(room(matchId));
    bindSocket(matchId, playerId, socket.id);
    socket.emit("match:state", viewForPlayer(record.match, playerId));
  });

  socket.on("round:command", (raw) => {
    const parsed = matchCommandSchema.safeParse(raw);
    if (!parsed.success) {
      socket.emit("match:error", { message: "Invalid command payload." });
      return;
    }

    const { matchId, commandId, type, payload } = parsed.data;
    const record = getMatch(matchId);
    if (!record) {
      socket.emit("match:error", { commandId, message: "Match not found." });
      return;
    }

    // Determine playerId by socket binding (simple MVP).
    const playerId = [...record.socketsByPlayer.entries()].find(([, sid]) => sid === socket.id)?.[0];
    if (!playerId) {
      socket.emit("match:error", { commandId, message: "Join match first." });
      return;
    }

    try {
      let events = [];
      if (type === "DRAW") events = commandDraw(record.match, playerId);
      else if (type === "STAND") events = commandStand(record.match, playerId);
      else {
        const pParsed = powerUpPayloadSchema.safeParse(payload);
        if (!pParsed.success) throw new Error("Invalid power-up payload.");
        events = commandPowerUp(record.match, playerId, pParsed.data);
      }

      for (const ev of events) io.to(room(matchId)).emit("match:event", ev);
      maybeAdvanceAfterRound(record);
      emitState(matchId);
    } catch (e) {
      socket.emit("match:error", { commandId, message: e instanceof Error ? e.message : "Command failed." });
    }
  });

  socket.on("disconnect", () => {
    // Best-effort cleanup (scan all matches; ok for MVP).
    for (const [matchId, record] of listMatches()) {
      for (const [playerId, sid] of record.socketsByPlayer.entries()) {
        if (sid === socket.id) unbindSocket(matchId, playerId, socket.id);
      }
    }
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on :${PORT}`);
});

