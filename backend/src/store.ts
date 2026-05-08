import { nanoid } from "nanoid";
import type { MatchState } from "./types.js";
import { addSecondPlayer, createMatch, startMatch, startNextRound } from "./engine.js";

type MatchRecord = {
  match: MatchState;
  // map playerId -> socketId (optional)
  socketsByPlayer: Map<string, string>;
};

const matches = new Map<string, MatchRecord>();

export function listMatches(): IterableIterator<[string, MatchRecord]> {
  return matches.entries();
}

export function newIds(): { matchId: string; playerId: string } {
  return { matchId: nanoid(8).toUpperCase(), playerId: nanoid(10) };
}

export function getMatch(matchId: string): MatchRecord | undefined {
  return matches.get(matchId);
}

export function createNewMatch(playerName: string): { matchId: string; playerId: string; record: MatchRecord } {
  const ids = newIds();
  const match = createMatch(ids.matchId, ids.playerId, playerName);
  const record: MatchRecord = { match, socketsByPlayer: new Map() };
  matches.set(ids.matchId, record);
  return { ...ids, record };
}

export function joinExistingMatch(
  matchId: string,
  playerName: string,
): { playerId: string; record: MatchRecord } {
  const record = matches.get(matchId);
  if (!record) throw new Error("Match not found.");
  if (record.match.playerOrder.length >= 2) throw new Error("Match is full.");
  const playerId = nanoid(10);
  addSecondPlayer(record.match, playerId, playerName);
  // auto-start once 2 players join
  startMatch(record.match);
  return { playerId, record };
}

export function bindSocket(matchId: string, playerId: string, socketId: string): void {
  const record = matches.get(matchId);
  if (!record) return;
  record.socketsByPlayer.set(playerId, socketId);
}

export function unbindSocket(matchId: string, playerId: string, socketId: string): void {
  const record = matches.get(matchId);
  if (!record) return;
  const existing = record.socketsByPlayer.get(playerId);
  if (existing === socketId) record.socketsByPlayer.delete(playerId);
}

export function maybeAdvanceAfterRound(record: MatchRecord): void {
  const { match } = record;
  if (match.status === "FINISHED") return;
  if (match.status !== "IN_PROGRESS") return;
  if (!match.round?.ended) return;
  // If tie (winnerPlayerId=null) we just start next round without life loss.
  // If non-tie, engine already applied life loss + match end if lives==0.
  if (match.round.winnerPlayerId === null) {
    startNextRound(match);
  } else {
    startNextRound(match);
  }
}

