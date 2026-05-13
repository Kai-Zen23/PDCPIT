import { Redis } from "ioredis";
import { nanoid } from "nanoid";
import type { MatchState, MatchEvent } from "./types.js";
import { addSecondPlayer, createMatch, startMatch, commandReady } from "./engine.js";

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
const TIMEOUTS_ZSET = "matches:timeouts";

export type MatchRecord = {
  match: MatchState;
  socketsByPlayer: Map<string, string>;
};

/**
 * Serializes MatchRecord for Redis storage.
 * socketsByPlayer Map is converted to an object for storage in a Redis Hash.
 */
export async function saveRecord(record: MatchRecord, providedMulti?: any): Promise<void> {
  const { match } = record;
  const matchId = match.id;

  const multi = providedMulti || redis.multi();

  // Save match state as JSON
  multi.set(MATCH_KEY(matchId), JSON.stringify(match));

  // Manage indices
  if (match.status === "WAITING" && match.playerOrder.length === 1 && !match.isPrivate) {
    multi.sadd(WAITING_MATCHES_SET, matchId);
  } else {
    multi.srem(WAITING_MATCHES_SET, matchId);
  }

  if (match.status !== "FINISHED") {
    multi.sadd(ACTIVE_MATCHES_SET, matchId);
  } else {
    multi.srem(ACTIVE_MATCHES_SET, matchId);
    multi.srem(WAITING_MATCHES_SET, matchId);
    multi.zrem(TIMEOUTS_ZSET, matchId);
    // Optional: add TTL for finished matches
    multi.expire(MATCH_KEY(matchId), 3600); 
    multi.expire(SOCKETS_KEY(matchId), 3600);
  }

  // We index BOTH turn timeouts and ready-up timeouts
  const timeout = (match.status === "IN_PROGRESS" && match.round?.turnStartedAt) 
    ? (match.round.turnStartedAt + 15500) 
    : (match.status === "WAITING" ? match.readyCountdownExpiresAt : null);

  if (timeout) {
    multi.zadd(TIMEOUTS_ZSET, timeout, matchId);
  } else {
    multi.zrem(TIMEOUTS_ZSET, matchId);
  }

  if (!providedMulti) {
    await multi.exec();
  }
}

export async function listActiveMatchIds(): Promise<string[]> {
  return await redis.smembers(ACTIVE_MATCHES_SET);
}

export async function listWaitingMatchIds(): Promise<string[]> {
  return await redis.smembers(WAITING_MATCHES_SET);
}

export async function getExpiredMatches(now: number): Promise<string[]> {
  return await redis.zrangebyscore(TIMEOUTS_ZSET, 0, now);
}

export async function findWaitingMatchId(): Promise<string | null> {
  // Safe loop instead of recursion to prevent stack overflow
  for (let attempts = 0; attempts < 10; attempts++) {
    const id = await redis.srandmember(WAITING_MATCHES_SET);
    if (!id) return null;

    const record = await getMatch(id);
    if (record && record.match.status === "WAITING" && record.match.playerOrder.length === 1) {
      return id;
    }

    // If we get here, the match ID was invalid/stale
    console.log(`[Queue] Purging invalid match ID: ${id}`);
    await redis.srem(WAITING_MATCHES_SET, id);
  }
  return null;
}

export async function getQueueCount(): Promise<number> {
  return await redis.scard(WAITING_MATCHES_SET);
}

export async function clearWaitingMatch(matchId: string): Promise<void> {
  await redis.srem(WAITING_MATCHES_SET, matchId);
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

export async function createNewMatch(playerName: string, isPrivate: boolean = false): Promise<{ matchId: string; playerId: string; record: MatchRecord }> {
  const ids = newIds();
  const match = createMatch(ids.matchId, ids.playerId, playerName, isPrivate);
  const record: MatchRecord = { match, socketsByPlayer: new Map() };
  await saveRecord(record);
  return { ...ids, record };
}

export async function joinExistingMatch(
  matchId: string,
  playerName: string,
): Promise<{ playerId: string; record: MatchRecord }> {
  const key = MATCH_KEY(matchId);
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    await redis.watch(key);
    const record = await getMatch(matchId);
    if (!record) {
      await redis.unwatch();
      throw new Error("Match not found.");
    }
    if (record.match.status !== "WAITING") {
      await redis.unwatch();
      throw new Error("Match already started or finished.");
    }
    if (record.match.playerOrder.length >= 2) {
      await redis.unwatch();
      throw new Error("Match is full.");
    }

    const playerId = nanoid(10);
    addSecondPlayer(record.match, playerId, playerName);

    const multi = redis.multi();
    await saveRecord(record, multi);
    const results = await multi.exec();

    if (results === null) {
      // Optimistic concurrency locking failure: another thread modified the key. Retry.
      continue;
    }

    return { playerId, record };
  }

  throw new Error("Server is experiencing high concurrent load. Join request dropped.");
}

/**
 * Acquires a distributed lock for a specific match to prevent duplicate interval execution
 * across horizontally scaled Nginx game server instances.
 */
export async function acquireMatchLock(matchId: string, ttlMs: number = 5000): Promise<boolean> {
  const lockKey = `lock:match:${matchId}`;
  const acquired = await redis.set(lockKey, "locked", "PX", ttlMs, "NX");
  return acquired === "OK";
}

/**
 * Releases the distributed match lock.
 */
export async function releaseMatchLock(matchId: string): Promise<void> {
  const lockKey = `lock:match:${matchId}`;
  await redis.del(lockKey);
}

export async function updateMatchState(match: MatchState): Promise<void> {
  const record = await getMatch(match.id);
  if (!record) return;
  record.match = match;
  await saveRecord(record);
}

export async function bindSocket(matchId: string, playerId: string, socketId: string): Promise<void> {
  await redis.hset(SOCKETS_KEY(matchId), playerId, socketId);
}

export async function unbindSocket(matchId: string, playerId: string, socketId: string): Promise<void> {
  const existing = await redis.hget(SOCKETS_KEY(matchId), playerId);
  if (existing === socketId) {
    await redis.hdel(SOCKETS_KEY(matchId), playerId);
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

/**
 * Autonomously injects an AI Bot opponent into a stalled queue match using OCC.
 */
export async function injectAiIntoMatch(matchId: string): Promise<{ botId: string; events: MatchEvent[]; record: MatchRecord } | null> {
  const key = MATCH_KEY(matchId);
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    await redis.watch(key);
    const record = await getMatch(matchId);
    if (!record || record.match.status !== "WAITING" || record.match.playerOrder.length >= 2) {
      await redis.unwatch();
      return null;
    }

    const botId = `bot_${nanoid(6)}`;
    addSecondPlayer(record.match, botId, "AI Duelist X21");
    record.match.players[botId]!.isBot = true;

    // Instantly start the match if the opponent is AI by auto-flagging both players as ready
    const humanId = record.match.playerOrder[0];
    if (humanId) {
      record.match.readyStatus[humanId] = true;
    }
    const events = commandReady(record.match, botId);

    const multi = redis.multi();
    await saveRecord(record, multi);
    const results = await multi.exec();

    if (results === null) {
      continue;
    }

    return { botId, events, record };
  }

  return null;
}
