import { useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import type { BackendPowerUp, BackendSocket, MatchEvent, MatchView } from "../../lib/backend";
import { createBackendSocket } from "../../lib/backend";
import { loadSession } from "../../lib/session";

type MatchError = { commandId?: string; message: string };

let globalSocket: BackendSocket | null = null;

export function useMatchConnection() {
  const session = loadSession();
  const [state, setState] = useState<MatchView | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [error, setError] = useState<MatchError | null>(null);

  const youId = session?.playerId ?? "";

  const isYourTurn = !!(state?.round && state.round.activePlayerId === youId);

  useEffect(() => {
    if (session && !state) {
      // Fetch initial state via HTTP to avoid waiting for WebSocket connect
      import("../../lib/backend").then(({ apiGetMatchState }) => {
        apiGetMatchState(session.matchId, session.playerId)
          .then((s) => setState(s))
          .catch(() => {});
      });
    }
  }, [session?.matchId, session?.playerId]);

  useEffect(() => {
    if (!session) return;

    if (!globalSocket) {
      globalSocket = createBackendSocket();
    }
    const socket = globalSocket;

    const onState = (s: MatchView) => setState(s);
    const onEvent = (e: MatchEvent) => setEvents((prev) => [e, ...prev].slice(0, 50));
    const onError = (e: MatchError) => setError(e);
    const onConnect = () => {
      socket.emit("match:join", { matchId: session.matchId, playerId: session.playerId });
    };

    socket.on("match:state", onState);
    socket.on("match:event", onEvent);
    socket.on("match:error", onError);
    socket.on("connect", onConnect);

    if (socket.connected) {
      // If already connected, join immediately
      onConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.off("match:state", onState);
      socket.off("match:event", onEvent);
      socket.off("match:error", onError);
      socket.off("connect", onConnect);
      // We keep globalSocket connected to avoid disconnect/reconnect on navigation
    };
  }, [session?.matchId, session?.playerId]);

  function sendCommand(type: "DRAW" | "STAND") {
    if (!session || !globalSocket) return;
    setError(null);
    globalSocket.emit("round:command", {
      matchId: session.matchId,
      commandId: nanoid(10),
      type,
    });
  }

  function usePowerUp(powerUp: BackendPowerUp, payloadExtra: any = {}) {
    if (!session || !globalSocket) return;
    setError(null);
    globalSocket.emit("round:command", {
      matchId: session.matchId,
      commandId: nanoid(10),
      type: "POWER_UP",
      payload: { type: powerUp, ...payloadExtra },
    });
  }

  return {
    session,
    state,
    events,
    error,
    isYourTurn,
    sendDraw: () => sendCommand("DRAW"),
    sendStand: () => sendCommand("STAND"),
    usePowerUp,
  };
}

