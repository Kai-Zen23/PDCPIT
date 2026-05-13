import { useEffect, useState } from "react";
import { nanoid } from "nanoid";
import type { BackendPowerUp, MatchEvent, MatchView } from "../../lib/backend";
import { loadSession } from "../../lib/session";
import { supabase } from "../../lib/supabase";
import { viewForPlayer } from "../../../supabase/functions/_shared/view";
import type { MatchState } from "../../../supabase/functions/_shared/types";

type MatchError = { commandId?: string; message: string };

export function disconnectGlobalSocket() {
  // Global socket unneeded in Supabase Realtime Channels paradigm
}

export function useMatchConnection() {
  const session = loadSession();
  const [state, setState] = useState<MatchView | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [error, setError] = useState<MatchError | null>(null);
  const [opponentPresence, setOpponentPresence] = useState(true);

  const youId = session?.playerId ?? "";
  const isYourTurn = !!(state?.round && state.round.activePlayerId === youId);

  // 1. Initial HTTP Fetch
  useEffect(() => {
    if (session && !state) {
      import("../../lib/backend").then(({ apiGetMatchState }) => {
        apiGetMatchState(session.matchId, session.playerId)
          .then((s) => setState((prev) => prev ? prev : s))
          .catch(() => {});
      });
    }
  }, [session?.matchId, session?.playerId]);

  // 2. Supabase Realtime Postgres Broadcast Subscription
  // Instant push synchronization over optimized HTTP2/WebSockets
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel(`realtime:match_${session.matchId}`, {
        config: {
          presence: {
            key: session.playerId,
          },
        },
      })
      .on("presence", { event: "sync" }, () => {
        const pState = channel.presenceState();
        // If more than 1 user key is registered in presence state, opponent is verified present
        // Or if game is waiting, presence allows smooth UI readiness
        setOpponentPresence(Object.keys(pState).length > 1);
      })
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to INSERT and UPDATE
          schema: "public",
          table: "matches",
          filter: `id=eq.${session.matchId}`,
        },
        (payload) => {
          if (payload.new && payload.new.state) {
            const rawState: MatchState = payload.new.state;
            try {
              const updatedView = viewForPlayer(rawState, session.playerId) as unknown as MatchView;
              setState((prev) => {
                // Preserve local optimistic ready status
                if (prev?.status === "WAITING" && prev.you && prev.readyStatus?.[prev.you.playerId]) {
                  updatedView.readyStatus[prev.you.playerId] = true;
                }
                return updatedView;
              });

              // Synthesize frontend match events reactive stream cleanly without duplicate layout trashing loops
              if (rawState.status === "IN_PROGRESS" && rawState.round?.roundNumber === 1) {
                setEvents((evs) => {
                  if (evs.some((e) => e.type === "MATCH:STARTED")) return evs;
                  return [{ type: "MATCH:STARTED", matchId: rawState.id }, ...evs].slice(0, 50);
                });
              }
            } catch (err) {
              console.warn("View projection update failed:", err);
            }
          }
        },
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.matchId, session?.playerId]);

  // 3. Resilient synchronization state polling fallback
  useEffect(() => {
    if (!session || state?.status === "IN_PROGRESS" || state?.status === "FINISHED") return;

    const interval = setInterval(() => {
      import("../../lib/backend").then(({ apiGetMatchState }) => {
        apiGetMatchState(session.matchId, session.playerId)
          .then((s) => {
            setState((prev) => {
              if (!prev) return s;
              if (prev.status === "WAITING" && prev.you && prev.readyStatus?.[prev.you.playerId]) {
                s.readyStatus[prev.you.playerId] = true;
              }
              if (s.status !== prev.status || JSON.stringify(s.readyStatus) !== JSON.stringify(prev.readyStatus)) {
                return s;
              }
              return prev;
            });
          })
          .catch(() => {});
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [session?.matchId, session?.playerId, state?.status]);

  function sendCommand(type: "DRAW" | "STAND" | "READY" | "NEXT_ROUND") {
    if (!session) return;
    setError(null);

    // --- OPTIMISTIC UI STATE COMMIT ---
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
          value: undefined,
        });
      } else if (type === "READY") {
        if (copy.you) {
          if (!copy.readyStatus) copy.readyStatus = {};
          copy.readyStatus[copy.you.playerId] = true;
        }
      }
      return copy;
    });

    const payloadData = {
      matchId: session.matchId,
      playerId: session.playerId,
      commandId: nanoid(10),
      type,
    };

    // Invoke ultra-low latency Supabase Edge function directly
    import("../../lib/backend").then(({ apiSendCommand }) => {
      apiSendCommand(session.matchId, payloadData).catch((err) => {
        console.warn("Edge command invocation failed:", err);
      });
    });
  }

  function usePowerUp(powerUp: BackendPowerUp, payloadExtra: any = {}) {
    if (!session) return;
    setError(null);

    setState((prev) => {
      if (!prev) return prev;
      const copy = JSON.parse(JSON.stringify(prev)) as typeof prev;
      if (copy.round?.you) {
        copy.round.you.powerUpUsedThisRound = true;
      }
      return copy;
    });

    const payloadData = {
      matchId: session.matchId,
      playerId: session.playerId,
      commandId: nanoid(10),
      type: "POWER_UP" as const,
      payload: { type: powerUp, ...payloadExtra },
    };

    import("../../lib/backend").then(({ apiSendCommand }) => {
      apiSendCommand(session.matchId, payloadData).catch((err) => {
        console.warn("Edge powerup invocation failed:", err);
      });
    });
  }

  async function claimTechnicalVictory() {
    if (!session) return;
    try {
      const { data } = await supabase.from("matches").select("state").eq("id", session.matchId).single();
      if (data && data.state) {
        const rawState: MatchState = data.state;
        rawState.status = "FINISHED";
        rawState.winnerPlayerId = session.playerId;
        if (rawState.round) {
          rawState.round.ended = true;
          rawState.round.winnerPlayerId = session.playerId;
        }
        await supabase
          .from("matches")
          .update({
            state: rawState,
            status: "FINISHED",
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.matchId);
      }
    } catch (err) {
      console.warn("Claim victory failed:", err);
    }
  }

  async function assignAiBotFallback() {
    if (!session) return;
    try {
      const { data } = await supabase.from("matches").select("state, player_count").eq("id", session.matchId).single();
      if (data && data.state && data.player_count === 1) {
        const rawState: MatchState = data.state;
        const botId = "bot_ai_neural";
        const botNames = [
          "Alex", "Jordan", "Taylor", "Morgan", "Sam", 
          "Chris", "Jamie", "Casey", "Riley", "Avery",
          "ShadowWeaver", "NeonKnight", "CyberSamurai", "NovaPulse", "Spectre21"
        ];
        const randomName = botNames[Math.floor(Math.random() * botNames.length)];

        rawState.players[botId] = {
          id: botId,
          name: randomName,
          lives: 3,
          powerUps: [],
          isBot: true,
        };
        rawState.playerOrder.push(botId);
        if (!rawState.readyStatus) rawState.readyStatus = {};
        rawState.readyStatus[botId] = true;
        rawState.readyStatus[session.playerId] = true;

        import("../../../supabase/functions/_shared/engine").then(async ({ startMatch }) => {
          startMatch(rawState);
          await supabase
            .from("matches")
            .update({
              state: rawState,
              player_count: 2,
              status: "IN_PROGRESS",
              updated_at: new Date().toISOString(),
            })
            .eq("id", session.matchId)
            .eq("player_count", 1);
        });
      }
    } catch (err) {
      console.warn("AI Fallback assignment failed:", err);
    }
  }

  return {
    session,
    state,
    events,
    error,
    isYourTurn,
    opponentPresence,
    sendDraw: () => sendCommand("DRAW"),
    sendStand: () => sendCommand("STAND"),
    sendNextRound: () => sendCommand("NEXT_ROUND"),
    sendReady: () => sendCommand("READY"),
    usePowerUp,
    claimTechnicalVictory,
    assignAiBotFallback,
  };
}
