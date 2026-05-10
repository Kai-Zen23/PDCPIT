import { useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import type { BackendPowerUp, BackendTarget, BackendSocket, MatchEvent, MatchView } from "../../lib/backend";
import { createBackendSocket } from "../../lib/backend";
import { loadSession } from "../../lib/session";

type MatchError = { commandId?: string; message: string };

export function useMatchConnection() {
  const session = loadSession();
  const [state, setState] = useState<MatchView | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [error, setError] = useState<MatchError | null>(null);
  const socketRef = useRef<BackendSocket | null>(null);

  const youId = session?.playerId ?? "";
  const matchId = session?.matchId ?? "";

  const isYourTurn = !!(state?.round && state.round.activePlayerId === youId);

  const nextOverrideTarget = useMemo((): BackendTarget => {
    const current = state?.round?.target ?? 21;
    if (current === 19) return 21;
    if (current === 21) return 28;
    return 19;
  }, [state?.round?.target]);

  useEffect(() => {
    if (!session) return;
    const socket = createBackendSocket();
    socketRef.current = socket;

    socket.on("match:state", (s) => setState(s));
    socket.on("match:event", (e) => setEvents((prev) => [e, ...prev].slice(0, 50)));
    socket.on("match:error", (e) => setError(e));

    socket.connect();
    socket.emit("match:join", { matchId: session.matchId, playerId: session.playerId });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session?.matchId, session?.playerId]);

  function sendCommand(type: "DRAW" | "STAND") {
    if (!session) return;
    setError(null);
    socketRef.current?.emit("round:command", {
      matchId: session.matchId,
      commandId: nanoid(10),
      type,
    });
  }

  function usePowerUp(powerUp: BackendPowerUp, payloadExtra: any = {}) {
    if (!session) return;
    setError(null);
    socketRef.current?.emit("round:command", {
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

