import { supabase } from "./supabase";
import { viewForPlayer } from "../../supabase/functions/_shared/view";
import type { MatchState } from "../../supabase/functions/_shared/types";

export type BackendPowerUp =
  | "card_destroyer"
  | "rightmost_removal"
  | "self_cleanse"
  | "double_purge"
  | "target_shift_19"
  | "target_shift_21"
  | "target_shift_28"
  | "shield"
  | "random_swap"
  | "sudden_risk"
  | "lucky_replace";
export type BackendTarget = 19 | 21 | 28;

export type MatchView = {
  matchId: string;
  status: "WAITING" | "IN_PROGRESS" | "FINISHED";
  serverTime: number;
  readyStatus: Record<string, boolean>;
  readyCountdownExpiresAt: number | null;
  you: { playerId: string; name: string; lives: number; powerUps: BackendPowerUp[] };
  opponent?: { playerId: string; name: string; lives: number; powerUpsCount: number };
  round?: {
    roundNumber: number;
    target: BackendTarget;
    activePlayerId: string;
    ended: boolean;
    winnerPlayerId: string | null;
    deckCount: number;
    revealAll: boolean;
    turnStartedAt: number;
    you: {
      stood: boolean;
      turnsTaken: number;
      powerUpUsedThisRound: boolean;
      hand: { id: string; value?: number; hidden?: boolean; visibility: "VISIBLE" | "HIDDEN_TO_OPPONENT" }[];
      totalVisible: number;
      totalActual: number;
      shielded: boolean;
    };
    opponent?: {
      stood: boolean;
      turnsTaken: number;
      powerUpUsedThisRound: boolean;
      hand: { id: string; value?: number; hidden?: boolean; visibility: "VISIBLE" | "HIDDEN_TO_OPPONENT" }[];
      totalVisible: number;
      shielded: boolean;
    };
  };
};

export type MatchEvent =
  | { type: "MATCH:STARTED"; matchId: string }
  | { type: "ROUND:STARTED"; matchId: string; roundNumber: number; target: BackendTarget }
  | { type: "TURN:CHANGED"; matchId: string; activePlayerId: string }
  | { type: "CARD:DRAWN"; matchId: string; playerId: string; cardId: string }
  | { type: "PLAYER:STOOD"; matchId: string; playerId: string }
  | { type: "POWER_UP:USED"; matchId: string; playerId: string; powerUp: BackendPowerUp }
  | { type: "ROUND:ENDED"; matchId: string; winnerPlayerId: string | null; revealAll: true }
  | { type: "LIFE:LOST"; matchId: string; playerId: string; lives: number }
  | { type: "MATCH:ENDED"; matchId: string; winnerPlayerId: string };

// Dummy Socket interface to keep React codebase fully typed during refactoring
export type BackendSocket = {
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  emit: (ev: string, data: any) => void;
  on: (ev: string, cb: any) => void;
  off: (ev: string, cb: any) => void;
};

export function createBackendSocket(): BackendSocket {
  return {
    connected: true,
    connect: () => {},
    disconnect: () => {},
    emit: () => {},
    on: () => {},
    off: () => {},
  };
}

export function instrumentWebSocketLatency(): void {}

export async function apiCreateMatch(playerName: string, isPrivate: boolean = false): Promise<{ matchId: string; playerId: string }> {
  const { data, error } = await supabase.functions.invoke("matchmaking", {
    body: { playerName, isPrivate },
  });
  if (error) throw new Error(error.message || "Failed to create match");
  return data;
}

export async function apiJoinMatch(matchId: string, playerName: string): Promise<{ matchId: string; playerId: string }> {
  const { data, error } = await supabase.functions.invoke("matchmaking", {
    body: { playerName, matchId },
  });
  if (error) throw new Error(error.message || "Failed to join match");
  return data;
}

export async function apiEnqueueMatchmaking(
  playerName: string,
): Promise<{ matchId: string; playerId: string; role: "CREATED" | "JOINED" }> {
  const { data, error } = await supabase.functions.invoke("matchmaking", {
    body: { playerName },
  });
  if (error) throw new Error(error.message || "Matchmaking failed");
  return data;
}

export async function apiCancelMatchmaking(matchId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("matchmaking", {
    body: { action: "cancel", matchId },
  });
  if (error) console.warn("Queue cancellation non-fatal warning:", error);
}

export async function apiGetMatchState(matchId: string, playerId: string): Promise<MatchView> {
  const { data, error } = await supabase
    .from("matches")
    .select("state")
    .eq("id", matchId)
    .single();

  if (error || !data) throw new Error("Match projection fetch failed");
  
  const rawState: MatchState = data.state;
  return viewForPlayer(rawState, playerId) as unknown as MatchView;
}

export async function apiSendCommand(matchId: string, payload: any): Promise<void> {
  const { error } = await supabase.functions.invoke("game-action", {
    body: payload,
  });
  if (error) throw new Error(error.message || "Action invocation failed");
}
