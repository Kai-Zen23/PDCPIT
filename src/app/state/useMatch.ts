import { useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import type { BackendPowerUp, BackendSocket, MatchEvent, MatchView } from "../../lib/backend";
import { createBackendSocket } from "../../lib/backend";
import { loadSession } from "../../lib/session";

type MatchError = { commandId?: string; message: string };

let globalSocket: BackendSocket | null = null;

export function disconnectGlobalSocket() {
  if (globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
  }
}

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
          .then((s) => setState((prev) => prev ? prev : s))
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
    const onPatch = ({ patch }: { patch: { type: string; payload?: any }; stateHash: string }) => {
      // Fast incremental differential evaluation
      setState((prev) => {
        if (!prev) return prev;
        // Deep copy safely to allow smooth local patch projection updates
        const updated = JSON.parse(JSON.stringify(prev)) as MatchView;
        if (patch.type === "DRAW" && updated.opponent && updated.round?.activePlayerId === updated.opponent.playerId) {
          // Increment opponent visual counter smoothly if differential packet indicates opponent move
          updated.round.opponent?.hand.push({
            id: `patch_${Date.now()}`,
            visibility: "VISIBLE",
            value: undefined
          });
        }
        return updated;
      });
    };
    const onEvent = (e: MatchEvent) => setEvents((prev) => [e, ...prev].slice(0, 50));
    const onError = (e: MatchError) => setError(e);
    const onConnect = () => {
      socket.emit("match:join", { matchId: session.matchId, playerId: session.playerId });
    };

    socket.on("match:state", onState);
    socket.on("match:patch", onPatch);
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
      socket.off("match:patch", onPatch);
      socket.off("match:event", onEvent);
      socket.off("match:error", onError);
      socket.off("connect", onConnect);
      // We keep globalSocket connected to avoid disconnect/reconnect on navigation
    };
  }, [session?.matchId, session?.playerId]);

  function sendCommand(type: "DRAW" | "STAND" | "READY" | "NEXT_ROUND") {
    if (!session || !globalSocket) return;
    setError(null);
    
    // --- OPTIMISTIC UI STATE COMMIT ---
    // Update local state reactive stores instantly without network roundtrip penalties
    setState((prev) => {
      if (!prev) return prev;
      const copy = JSON.parse(JSON.stringify(prev)) as typeof prev;
      if (type === "STAND" && copy.round?.you) {
        copy.round.you.stood = true;
        if (copy.opponent) {
          copy.round.activePlayerId = copy.opponent.playerId;
        }
      } else if (type === "DRAW" && copy.round?.you) {
        copy.round.you.turnsTaken += 1;
        copy.round.you.hand.push({
          id: `opt_${nanoid(4)}`,
          visibility: "VISIBLE",
          value: undefined // Cryptographically masked until actual server response arrives
        });
      } else if (type === "READY") {
        if (copy.you) {
          if (!copy.readyStatus) copy.readyStatus = {};
          copy.readyStatus[copy.you.playerId] = true;
        }
      }
      return copy;
    });

    globalSocket.emit("round:command", {
      matchId: session.matchId,
      playerId: session.playerId,
      commandId: nanoid(10),
      type,
    });
  }

  function usePowerUp(powerUp: BackendPowerUp, payloadExtra: any = {}) {
    if (!session || !globalSocket) return;
    setError(null);
    
    // Optimistically flag powerup usage to disable buttons instantly
    setState((prev) => {
      if (!prev) return prev;
      const copy = JSON.parse(JSON.stringify(prev)) as typeof prev;
      if (copy.round?.you) {
        copy.round.you.powerUpUsedThisRound = true;
      }
      return copy;
    });

    globalSocket.emit("round:command", {
      matchId: session.matchId,
      playerId: session.playerId,
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
    sendNextRound: () => sendCommand("NEXT_ROUND"),
    sendReady: () => sendCommand("READY"),
    usePowerUp,
  };
}

