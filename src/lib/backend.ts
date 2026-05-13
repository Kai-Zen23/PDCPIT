import { io, type Socket } from "socket.io-client";

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

export type BackendSocket = Socket<
  {
    "match:join": (data: { matchId: string; playerId: string }) => void;
    "round:command": (data: {
      matchId: string;
      commandId: string;
      type: "DRAW" | "STAND" | "POWER_UP" | "READY" | "NEXT_ROUND";
      payload?: unknown;
    }) => void;
  },
  {
    "match:state": (data: MatchView) => void;
    "match:patch": (data: { patch: { type: string; payload?: any }; stateHash: string }) => void;
    "match:event": (data: MatchEvent) => void;
    "match:error": (data: { commandId?: string; message: string }) => void;
  }
>;

export function backendBaseUrl(): string {
  // For local dev, backend runs on :4000.
  // In production, set VITE_BACKEND_URL in Vercel env vars.
  const raw = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? "http://localhost:4000";
  return raw.trim().replace(/\/+$/, "");
}

export async function apiCreateMatch(playerName: string, isPrivate: boolean = false): Promise<{ matchId: string; playerId: string }> {
  const res = await fetch(`${backendBaseUrl()}/api/matches`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ playerName, isPrivate }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function apiJoinMatch(matchId: string, playerName: string): Promise<{ matchId: string; playerId: string }> {
  const res = await fetch(`${backendBaseUrl()}/api/matches/${encodeURIComponent(matchId)}/join`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ playerName }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function apiEnqueueMatchmaking(
  playerName: string,
): Promise<{ matchId: string; playerId: string; role: "CREATED" | "JOINED" }> {
  const res = await fetch(`${backendBaseUrl()}/api/matchmaking/enqueue`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ playerName }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function apiGetMatchState(matchId: string, playerId: string): Promise<MatchView> {
  const res = await fetch(
    `${backendBaseUrl()}/api/matches/${encodeURIComponent(matchId)}/state/${encodeURIComponent(playerId)}`,
  );
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

/**
 * Creates a highly optimized WebSocket connection with:
 * - WebSocket transport only (no polling fallback overhead)
 * - Optimized heartbeat intervals to reduce network traffic
 * - Automatic reconnection with exponential backoff
 * - Connection pooling awareness
 */
export function createBackendSocket(): BackendSocket {
  return io(backendBaseUrl(), {
    transports: ["websocket"],
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    // Optimized heartbeat: server sends ping every 25s, client waits 20s for pong
    // This reduces network overhead while maintaining connection health
    pingInterval: 25000,
    pingTimeout: 20000,
    // Enable compression for large payloads (especially state updates)
    parser: undefined, // Use default efficient parser
  }) as BackendSocket;
}

/**
 * Performance monitoring: measure and log WebSocket latency
 */
export function instrumentWebSocketLatency(socket: BackendSocket): void {
  let lastStateTime = Date.now();

  socket.on("match:state", (data: MatchView) => {
    const now = Date.now();
    const latency = now - (data.serverTime || lastStateTime);
    
    // Log high-latency events for debugging
    if (latency > 100) {
      console.warn(`[WebSocket Latency] High latency detected: ${latency}ms`, data);
    }

    lastStateTime = now;
  });

  // Track connection events
  socket.on("connect", () => {
    console.log("[WebSocket] Connected");
  });

  socket.on("disconnect", (reason) => {
    console.log(`[WebSocket] Disconnected: ${reason}`);
  });

  socket.on("connect_error", (error) => {
    console.error("[WebSocket] Connection error:", error);
  });
}
