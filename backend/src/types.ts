import { z } from "zod";

// ---- Core constants

export const TARGET_VALUES = [19, 21, 28] as const;
export type TargetValue = (typeof TARGET_VALUES)[number];

export const POWER_UP_TYPES = [
  "card_destroyer",
  "rightmost_removal",
  "self_cleanse",
  "double_purge",
  "target_shift_19",
  "target_shift_21",
  "target_shift_28",
  "shield",
  "random_swap",
  "sudden_risk",
  "lucky_replace",
] as const;
export type PowerUpType = (typeof POWER_UP_TYPES)[number];

export const COMMAND_TYPES = ["DRAW", "STAND", "POWER_UP", "NEXT_ROUND"] as const;
export type CommandType = (typeof COMMAND_TYPES)[number];

// ---- Public schemas

export const createMatchSchema = z.object({
  playerName: z.string().trim().min(1).max(20),
});
export type CreateMatchInput = z.infer<typeof createMatchSchema>;

export const joinMatchSchema = z.object({
  playerName: z.string().trim().min(1).max(20),
});
export type JoinMatchInput = z.infer<typeof joinMatchSchema>;

export const powerUpPayloadSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("card_destroyer"), targetCardIndex: z.number().optional() }),
  z.object({ type: z.literal("rightmost_removal") }),
  z.object({ type: z.literal("self_cleanse") }),
  z.object({ type: z.literal("double_purge") }),
  z.object({ type: z.literal("target_shift_19") }),
  z.object({ type: z.literal("target_shift_21") }),
  z.object({ type: z.literal("target_shift_28") }),
  z.object({ type: z.literal("shield") }),
  z.object({ type: z.literal("random_swap") }),
  z.object({ type: z.literal("sudden_risk") }),
  z.object({ type: z.literal("lucky_replace"), discardIndex: z.number().optional() }),
]);

export const matchCommandSchema = z.object({
  matchId: z.string().min(1),
  commandId: z.string().min(1),
  type: z.union([z.literal("DRAW"), z.literal("STAND"), z.literal("POWER_UP"), z.literal("NEXT_ROUND")]),
  payload: z.unknown().optional(),
});
export type MatchCommandInput = z.infer<typeof matchCommandSchema>;

// ---- Socket events

export type ClientToServerEvents = {
  "match:join": (data: { matchId: string; playerId: string }) => void;
  "round:command": (data: MatchCommandInput) => void;
};

export type ServerToClientEvents = {
  "match:state": (data: MatchViewForPlayer) => void;
  "match:event": (data: MatchEvent) => void;
  "match:error": (data: { commandId?: string; message: string }) => void;
};

// ---- Internal game types

export type Card = {
  id: string;
  value: number;
  // first 2 cards are dealt as visible+hidden; later draws are visible.
  visibility: "VISIBLE" | "HIDDEN_TO_OPPONENT";
  // "last drawn" means the most recent card added to the hand, including the initial deal.
  drawnAtTurnIndex: number; // monotonically increasing per-player in a round
};

export type RoundPlayerState = {
  stood: boolean;
  turnsTaken: number; // max 3
  powerUpUsedThisRound: boolean;
  hand: Card[];
  drawIndex: number; // increments whenever a card is added (used for "last drawn")
  shielded: boolean;
};

export type RoundState = {
  roundNumber: number;
  target: TargetValue;
  deck: number[]; // remaining values
  activePlayerId: string;
  players: Record<string, RoundPlayerState>;
  ended: boolean;
  winnerPlayerId: string | null; // null for tie
  // for reveal
  revealAll: boolean;
  turnStartedAt: number;
};

export type MatchPlayer = {
  id: string;
  name: string;
  lives: number;
  powerUps: PowerUpType[];
};

export type MatchState = {
  id: string;
  status: "WAITING" | "IN_PROGRESS" | "FINISHED";
  createdAt: number;
  players: Record<string, MatchPlayer>;
  playerOrder: string[]; // length <= 2
  round: RoundState | null;
};

// ---- Views (filtered for each player)

export type CardView = {
  id: string;
  value?: number;
  hidden?: boolean;
  visibility: Card["visibility"];
};

export type MatchViewForPlayer = {
  matchId: string;
  status: MatchState["status"];
  serverTime: number;
  you: { playerId: string; name: string; lives: number; powerUps: PowerUpType[] };
  opponent?: { playerId: string; name: string; lives: number; powerUpsCount: number };
  round?: {
    roundNumber: number;
    target: TargetValue;
    activePlayerId: string;
    ended: boolean;
    winnerPlayerId: string | null;
    you: {
      stood: boolean;
      turnsTaken: number;
      powerUpUsedThisRound: boolean;
      hand: CardView[];
      totalVisible: number;
      totalActual: number;
      shielded: boolean;
    };
    opponent?: {
      stood: boolean;
      turnsTaken: number;
      powerUpUsedThisRound: boolean;
      hand: CardView[];
      totalVisible: number;
      shielded: boolean;
    };
    deckCount: number;
    revealAll: boolean;
    turnStartedAt: number;
  };
};

export type MatchEvent =
  | { type: "MATCH:STARTED"; matchId: string }
  | { type: "ROUND:STARTED"; matchId: string; roundNumber: number; target: TargetValue }
  | { type: "TURN:CHANGED"; matchId: string; activePlayerId: string }
  | { type: "CARD:DRAWN"; matchId: string; playerId: string; cardId: string }
  | { type: "PLAYER:STOOD"; matchId: string; playerId: string }
  | { type: "POWER_UP:USED"; matchId: string; playerId: string; powerUp: PowerUpType }
  | { type: "ROUND:ENDED"; matchId: string; winnerPlayerId: string | null; revealAll: true }
  | { type: "LIFE:LOST"; matchId: string; playerId: string; lives: number }
  | { type: "MATCH:ENDED"; matchId: string; winnerPlayerId: string };

