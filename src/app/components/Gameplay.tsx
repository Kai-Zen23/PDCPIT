import { useMemo } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Heart, Plus, Minus, Target, Zap, Trash2, RefreshCw } from "lucide-react";
import type { BackendPowerUp } from "../../lib/backend";
import { useMatchConnection } from "../state/useMatch";

function labelForPowerUp(p: BackendPowerUp) {
  if (p === "REMOVE") return "Remove Card";
  if (p === "SWAP") return "Swap Card";
  if (p === "OVERRIDE") return "Override";
  return "Double";
}

export function Gameplay() {
  const navigate = useNavigate();
  const { state, events, error, isYourTurn, sendDraw, sendStand, usePowerUp, nextOverrideTarget } =
    useMatchConnection();

  const actionLog = useMemo(() => {
    if (!state) return ["Connecting..."];
    const lines = events.map((e) => {
      switch (e.type) {
        case "ROUND:STARTED":
          return `Round ${e.roundNumber} started (target ${e.target})`;
        case "TURN:CHANGED":
          return e.activePlayerId === state.you.playerId ? "Your turn" : "Opponent's turn";
        case "CARD:DRAWN":
          return e.playerId === state.you.playerId ? "You drew a card" : "Opponent drew a card";
        case "PLAYER:STOOD":
          return e.playerId === state.you.playerId ? "You stand" : "Opponent stands";
        case "POWER_UP:USED":
          return e.playerId === state.you.playerId
            ? `You used ${labelForPowerUp(e.powerUp)}`
            : `Opponent used ${labelForPowerUp(e.powerUp)}`;
        case "ROUND:ENDED":
          return e.winnerPlayerId === null
            ? "Round ended in a tie"
            : e.winnerPlayerId === state.you.playerId
              ? "You won the round"
              : "You lost the round";
        case "MATCH:ENDED":
          return e.winnerPlayerId === state.you.playerId ? "You win the match" : "You lose the match";
        default:
          return e.type;
      }
    });
    return ["Game started", ...lines];
  }, [events, state]);

  const round = state?.round;
  const you = state?.you;
  const opp = state?.opponent;

  const myHand = round?.you.hand ?? [];
  const oppHand = round?.opponent?.hand ?? [];
  const opponentVisibleTotal = round?.opponent?.totalVisible ?? 0;
  const playerTotal = round?.you.totalActual ?? 0;
  const currentTurn = round?.activePlayerId === you?.playerId ? "player" : "opponent";

  // Navigation on match end
  if (state?.status === "FINISHED") {
    const winner = (round?.winnerPlayerId ?? null) === you?.playerId;
    setTimeout(() => navigate(winner ? "/victory" : "/defeat"), 300);
  }

  return (
    <div className="min-h-screen bg-[#121212] relative overflow-hidden" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[#9D4EDD] opacity-5 blur-[150px] rounded-full"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* TOP SECTION - Opponent */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6"
        >
          <div
            className={`bg-[#1E1E1E]/80 backdrop-blur-sm border-2 rounded-2xl p-6 transition-all ${
              currentTurn === "opponent"
                ? 'border-[#9D4EDD] shadow-[0_0_40px_rgba(157,78,221,0.6)]'
                : 'border-[#9D4EDD]/30'
            }`}
          >
            {/* Opponent info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-2xl text-[#F5F5F5]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  {opp?.name ?? "Opponent"}
                </h3>
                <div className="flex gap-2">
                  {[...Array(3)].map((_, i) => (
                    <Heart
                      key={i}
                      className={`w-6 h-6 ${
                        i < (opp?.lives ?? 3) ? 'text-[#D62828] fill-[#D62828]' : 'text-[#B0B0B0]/30'
                      }`}
                      style={i < (opp?.lives ?? 3) ? { filter: 'drop-shadow(0 0 8px #D62828)' } : {}}
                    />
                  ))}
                </div>
              </div>
              <div className="text-[#B0B0B0]">
                Cards: {oppHand.length}
              </div>
            </div>

            {/* Opponent cards */}
            <div className="flex gap-3 justify-center">
              {oppHand.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`w-20 h-28 rounded-xl flex items-center justify-center ${
                    !card.hidden
                      ? 'bg-gradient-to-br from-[#1E1E1E] to-[#2A2A2A] border-2 border-[#9D4EDD]'
                      : 'bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] border-2 border-[#B0B0B0]/30'
                  }`}
                  style={{
                    boxShadow: !card.hidden ? '0 0 20px rgba(157, 78, 221, 0.5)' : 'none'
                  }}
                >
                  {!card.hidden ? (
                    <span
                      className="text-4xl text-[#9D4EDD]"
                      style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                      {card.value ?? 0}
                    </span>
                  ) : (
                    <span className="text-4xl text-[#B0B0B0]">?</span>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Opponent total */}
            <div className="text-center mt-4">
              <span className="text-[#B0B0B0] text-sm">Visible Total: </span>
              <span className="text-[#9D4EDD] text-xl" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                {opponentVisibleTotal}
              </span>
            </div>
          </div>
        </motion.div>

        {/* CENTER SECTION - Battlefield */}
        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="grid grid-cols-2 gap-8 w-full max-w-4xl">
            {/* Target number */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center"
            >
              <Target className="w-12 h-12 text-[#9D4EDD] mb-4" />
              <div className="text-center">
                <p className="text-[#B0B0B0] text-sm uppercase tracking-wide mb-2">Target</p>
                <div
                  className="text-8xl text-[#9D4EDD]"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    textShadow: '0 0 60px rgba(157, 78, 221, 1), 0 0 100px rgba(157, 78, 221, 0.6)'
                  }}
                >
                  {round?.target ?? 21}
                </div>
              </div>
            </motion.div>

            {/* Action log */}
            <div className="bg-[#1E1E1E]/60 backdrop-blur-sm border border-[#9D4EDD]/30 rounded-xl p-4">
              <h4 className="text-[#9D4EDD] mb-3 text-sm uppercase tracking-wide flex items-center gap-2">
                <div className="w-2 h-2 bg-[#9D4EDD] rounded-full animate-pulse"></div>
                Action Log
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                <AnimatePresence>
                  {actionLog.slice(0, 6).map((action, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="text-[#B0B0B0] text-sm"
                    >
                      <span className="text-[#4CC9F0]">›</span> {action}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION - Player */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6"
        >
          <div
            className={`bg-[#1E1E1E]/80 backdrop-blur-sm border-2 rounded-2xl p-6 transition-all ${
              currentTurn === "player"
                ? 'border-[#4CC9F0] shadow-[0_0_40px_rgba(76,201,240,0.6)]'
                : 'border-[#4CC9F0]/30'
            }`}
          >
            {/* Player info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-2xl text-[#F5F5F5]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  {you?.name ?? "You"}
                </h3>
                <div className="flex gap-2">
                  {[...Array(3)].map((_, i) => (
                    <Heart
                      key={i}
                      className={`w-6 h-6 ${
                        i < (you?.lives ?? 3) ? 'text-[#2ECC71] fill-[#2ECC71]' : 'text-[#B0B0B0]/30'
                      }`}
                      style={i < (you?.lives ?? 3) ? { filter: 'drop-shadow(0 0 8px #2ECC71)' } : {}}
                    />
                  ))}
                </div>
              </div>
              <div className="text-[#4CC9F0] text-3xl" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Total: {playerTotal}
              </div>
            </div>

            {/* Player cards */}
            <div className="flex gap-3 justify-center mb-6">
              {myHand.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, scale: 0.8, y: 50 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="w-24 h-36 bg-gradient-to-br from-[#1E1E1E] to-[#2A2A2A] border-2 border-[#4CC9F0] rounded-xl flex items-center justify-center"
                  style={{
                    boxShadow: '0 0 25px rgba(76, 201, 240, 0.6)'
                  }}
                >
                  <span
                    className="text-5xl text-[#4CC9F0]"
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                  >
                    {card.value ?? 0}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={sendDraw}
                disabled={!isYourTurn || !!round?.you.stood}
                className="px-6 py-4 bg-gradient-to-r from-[#9D4EDD] to-[#8B3DC7] rounded-xl text-[#F5F5F5] text-lg tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  boxShadow: currentTurn === "player" ? '0 0 30px rgba(157, 78, 221, 0.6)' : 'none'
                }}
              >
                <Plus className="w-5 h-5" />
                DRAW
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={sendStand}
                disabled={!isYourTurn || !!round?.you.stood}
                className="px-6 py-4 bg-[#1E1E1E] border-2 border-[#B0B0B0]/50 rounded-xl text-[#F5F5F5] text-lg tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:border-[#B0B0B0]"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                <Minus className="w-5 h-5" />
                STAND
              </motion.button>
            </div>

            {/* Power-ups */}
            <div className="border-t border-[#9D4EDD]/30 pt-4">
              <h4 className="text-[#4CC9F0] text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Power-Ups
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {([
                  { type: "REMOVE" as const, icon: Trash2, label: "Remove Card" },
                  { type: "SWAP" as const, icon: RefreshCw, label: "Swap Card" },
                  { type: "OVERRIDE" as const, icon: Target, label: `Override → ${nextOverrideTarget}` },
                  { type: "DOUBLE" as const, icon: Zap, label: "Double" },
                ] as const).map((powerup) => (
                  <motion.button
                    key={powerup.type}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => usePowerUp(powerup.type)}
                    disabled={
                      !isYourTurn ||
                      !!round?.you.stood ||
                      !!round?.you.powerUpUsedThisRound ||
                      !(you?.powerUps ?? []).includes(powerup.type)
                    }
                    className="bg-[#121212] border border-[#4CC9F0]/40 rounded-lg p-3 flex flex-col items-center gap-2 hover:border-[#4CC9F0] hover:bg-[#4CC9F0]/10 transition-all"
                    style={{ boxShadow: '0 0 15px rgba(76, 201, 240, 0.2)' }}
                  >
                    <powerup.icon className="w-6 h-6 text-[#4CC9F0]" />
                    <span className="text-[#B0B0B0] text-xs">{powerup.label}</span>
                  </motion.button>
                ))}
              </div>
              {error?.message && <p className="text-[#D62828] mt-3 text-sm">{error.message}</p>}
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(157, 78, 221, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #9D4EDD;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
