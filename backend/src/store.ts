import { Redis } from "ioredis";
import { nanoid } from "nanoid";
import type { MatchState } from "./types.js";
import { addSecondPlayer, createMatch, startMatch } from "./engine.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

redis.on("error", (err) => {
  console.error("[Redis Error]", err);
});


// Key Prefixes
const MATCH_KEY = (id: string) => `match:${id}`;
const SOCKETS_KEY = (id: string) => `sockets:${id}`;
const WAITING_MATCHES_SET = "matches:waiting";
const ACTIVE_MATCHES_SET = "matches:active";

export type MatchRecord = {
  match: MatchState;
  socketsByPlayer: Map<string, string>;
};

/**
 * Serializes MatchRecord for Redis storage.
 * socketsByPlayer Map is converted to an object for storage in a Redis Hash.
 */
async function saveRecord(record: MatchRecord): Promise<void> {
  const { match, socketsByPlayer } = record;
  const matchId = match.id;

  const multi = redis.multi();

  // Save match state as JSON
  multi.set(MATCH_KEY(matchId), JSON.stringify(match));

  // Save sockets as Hash
  const socketsObj: Record<string, string> = {};
  for (const [pId, sId] of socketsByPlayer.entries()) {
    socketsObj[pId] = sId;
  }
  
  if (Object.keys(socketsObj).length > 0) {
    multi.hset(SOCKETS_KEY(matchId), socketsObj);
  }

  // Manage indices
  if (match.status === "WAITING" && match.playerOrder.length === 1) {
    multi.sadd(WAITING_MATCHES_SET, matchId);
  } else {
    multi.srem(WAITING_MATCHES_SET, matchId);
  }

  if (match.status !== "FINISHED") {
    multi.sadd(ACTIVE_MATCHES_SET, matchId);
  } else {
    multi.srem(ACTIVE_MATCHES_SET, matchId);
    multi.srem(WAITING_MATCHES_SET, matchId);
    // Optional: add TTL for finished matches
    multi.expire(MATCH_KEY(matchId), 3600); 
    multi.expire(SOCKETS_KEY(matchId), 3600);
  }

  await multi.exec();
}

export async function listActiveMatchIds(): Promise<string[]> {
  return await redis.smembers(ACTIVE_MATCHES_SET);
}

export async function findWaitingMatchId(): Promise<string | null> {
  return await redis.srandmember(WAITING_MATCHES_SET);
}

export function newIds(): { matchId: string; playerId: string } {
  return { matchId: nanoid(8).toUpperCase(), playerId: nanoid(10) };
}

export async function getMatch(matchId: string): Promise<MatchRecord | undefined> {
  const matchData = await redis.get(MATCH_KEY(matchId));
  if (!matchData) return undefined;

  const socketsData = await redis.hgetall(SOCKETS_KEY(matchId));
  const socketsByPlayer = new Map<string, string>();
  for (const [pId, sId] of Object.entries(socketsData)) {
    socketsByPlayer.set(pId, sId);
  }

  return {
    match: JSON.parse(matchData),
    socketsByPlayer,
  };
}

export async function createNewMatch(playerName: string): Promise<{ matchId: string; playerId: string; record: MatchRecord }> {
  const ids = newIds();
  const match = createMatch(ids.matchId, ids.playerId, playerName);
  const record: MatchRecord = { match, socketsByPlayer: new Map() };
  await saveRecord(record);
  return { ...ids, record };
}

export async function joinExistingMatch(
  matchId: string,
  playerName: string,
): Promise<{ playerId: string; record: MatchRecord }> {
  const record = await getMatch(matchId);
  if (!record) throw new Error("Match not found.");
  if (record.match.playerOrder.length >= 2) throw new Error("Match is full.");
  
  const playerId = nanoid(10);
  addSecondPlayer(record.match, playerId, playerName);
  
  // Update state
  await saveRecord(record);
  return { playerId, record };
}



export async function updateMatchState(match: MatchState): Promise<void> {
  const record = await getMatch(match.id);
  if (!record) return;
  record.match = match;
  await saveRecord(record);
}

export async function bindSocket(matchId: string, playerId: string, socketId: string): Promise<void> {
  const record = await getMatch(matchId);
  if (!record) return;
  record.socketsByPlayer.set(playerId, socketId);
  await saveRecord(record);
}

export async function unbindSocket(matchId: string, playerId: string, socketId: string): Promise<void> {
  const record = await getMatch(matchId);
  if (!record) return;
  const existing = record.socketsByPlayer.get(playerId);
  if (existing === socketId) {
    record.socketsByPlayer.delete(playerId);
    // Also remove from Redis Hash explicitly
    await redis.hdel(SOCKETS_KEY(matchId), playerId);
    await saveRecord(record);
  }
}

export async function maybeAdvanceAfterRound(record: MatchRecord): Promise<void> {
  const { match } = record;
  if (match.status === "FINISHED") return;
  if (match.status !== "IN_PROGRESS") return;
  if (!match.round?.ended) return;

  const completedRound = match.round.roundNumber;

  if (completedRound >= 3) {
    match.status = "FINISHED";
    
    // Final health-based tie-breaker
    const [p1id, p2id] = match.playerOrder;
    const p1 = match.players[p1id!]!;
    const p2 = match.players[p2id!]!;

    if (p1.lives > p2.lives) {
      match.winnerPlayerId = p1id!;
    } else if (p2.lives > p1.lives) {
      match.winnerPlayerId = p2id!;
    } else {
      match.winnerPlayerId = null; // DRAW
    }
    await saveRecord(record);
    return;
  }
}


