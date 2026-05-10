import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { 
  Heart, Plus, Minus, Target, Zap, Trash2, Scissors, 
  Eraser, Shield, Repeat, TrendingUp, Search, Activity
} from "lucide-react";
import { useMatchConnection } from "../state/useMatch";
import type { BackendPowerUp } from "../../lib/backend";

const POWER_UP_CONFIG: Record<BackendPowerUp, { icon: any, label: string }> = {
  card_destroyer: { icon: Trash2, label: "Destroy Opp" },
  rightmost_removal: { icon: Scissors, label: "Rem Opp Last" },
  self_cleanse: { icon: Eraser, label: "Rem Self Last" },
  double_purge: { icon: Trash2, label: "Purge 2" },
  target_shift_19: { icon: Target, label: "Target 19" },
  target_shift_21: { icon: Target, label: "Target 21" },
  target_shift_28: { icon: Target, label: "Target 28" },
  shield: { icon: Shield, label: "Shield" },
  random_swap: { icon: Repeat, label: "Swap Random" },
  sudden_risk: { icon: TrendingUp, label: "Double Last" },
  lucky_replace: { icon: Search, label: "Replace One" },
};

export function Gameplay() {
  const navigate = useNavigate();
  const { state, events, error, isYourTurn, sendDraw, sendStand, usePowerUp } = useMatchConnection();

  useEffect(() => {
    if (state?.status === "FINISHED") {
      const winnerId = state.round?.winnerPlayerId;
      if (winnerId === state.you.playerId) {
        navigate("/victory");
      } else {
        navigate("/defeat");
      }
    }
  }, [state?.status, state?.round?.winnerPlayerId, state?.you.playerId, navigate]);

  if (!state) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-[#4CC9F0] animate-pulse text-2xl font-orbitron">CONNECTING TO NEURAL LINK...</div>
      </div>
    );
  }

  const you = state.you;
  const opponent = state.opponent;
  const round = state.round;

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
              round?.activePlayerId === opponent?.playerId
                ? 'border-[#9D4EDD] shadow-[0_0_40px_rgba(157,78,221,0.6)]'
                : 'border-[#9D4EDD]/30'
            } ${round?.opponent?.shielded ? 'ring-4 ring-[#4CC9F0]/50' : ''}`}
          >
            {/* Opponent info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-2xl text-[#F5F5F5] font-orbitron">
                  {opponent?.name ?? "OPPONENT"}
                </h3>
                <div className="flex gap-2">
                  {[...Array(3)].map((_, i) => (
                    <Heart
                      key={i}
                      className={`w-6 h-6 ${
                        i < (opponent?.lives ?? 0) ? 'text-[#D62828] fill-[#D62828]' : 'text-[#B0B0B0]/30'
                      }`}
                      style={i < (opponent?.lives ?? 0) ? { filter: 'drop-shadow(0 0 8px #D62828)' } : {}}
                    />
                  ))}
                </div>
                {round?.opponent?.shielded && (
                  <div className="bg-[#4CC9F0]/20 text-[#4CC9F0] text-xs px-2 py-1 rounded border border-[#4CC9F0]/50 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> SHIELD ACTIVE
                  </div>
                )}
              </div>
              <div className="text-[#B0B0B0]">
                Cards: {round?.opponent?.hand.length ?? 0}
              </div>
            </div>

            {/* Opponent cards */}
            <div className="flex gap-3 justify-center">
              {round?.opponent?.hand.map((card, index) => (
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
                    <span className="text-4xl text-[#9D4EDD] font-orbitron">
                      {card.value}
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
              <span className="text-[#9D4EDD] text-xl font-orbitron">
                {round?.opponent?.totalVisible ?? 0}
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
                  className="text-8xl text-[#9D4EDD] font-orbitron"
                  style={{
                    textShadow: '0 0 60px rgba(157, 78, 221, 1), 0 0 100px rgba(157, 78, 221, 0.6)'
                  }}
                >
                  {round?.target ?? 21}
                </div>
              </div>
            </motion.div>

            {/* Action log */}
            <div className="bg-[#1E1E1E]/60 backdrop-blur-sm border border-[#9D4EDD]/30 rounded-xl p-4 flex flex-col">
              <h4 className="text-[#9D4EDD] mb-3 text-sm uppercase tracking-wide flex items-center gap-2">
                <div className="w-2 h-2 bg-[#9D4EDD] rounded-full animate-pulse"></div>
                Neural Action Stream
              </h4>
              <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="popLayout">
                  {events.map((event, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="text-[#B0B0B0] text-sm font-mono"
                    >
                      <span className="text-[#4CC9F0]">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span> {event.type}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {error && (
                  <div className="text-red-400 text-xs mt-2 p-2 bg-red-900/20 border border-red-900/50 rounded italic">
                    ERROR: {error.message}
                  </div>
                )}
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
              isYourTurn
                ? 'border-[#4CC9F0] shadow-[0_0_40px_rgba(76,201,240,0.6)]'
                : 'border-[#4CC9F0]/30'
            } ${round?.you?.shielded ? 'ring-4 ring-[#4CC9F0]/50' : ''}`}
          >
            {/* Player info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-2xl text-[#F5F5F5] font-orbitron">
                  {you.name}
                </h3>
                <div className="flex gap-2">
                  {[...Array(3)].map((_, i) => (
                    <Heart
                      key={i}
                      className={`w-6 h-6 ${
                        i < you.lives ? 'text-[#2ECC71] fill-[#2ECC71]' : 'text-[#B0B0B0]/30'
                      }`}
                      style={i < you.lives ? { filter: 'drop-shadow(0 0 8px #2ECC71)' } : {}}
                    />
                  ))}
                </div>
                {round?.you?.shielded && (
                  <div className="bg-[#4CC9F0]/20 text-[#4CC9F0] text-xs px-2 py-1 rounded border border-[#4CC9F0]/50 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> SHIELD ACTIVE
                  </div>
                )}
              </div>
              <div className="text-[#4CC9F0] text-3xl font-orbitron">
                Total: {round?.you?.totalActual ?? 0}
              </div>
            </div>

            {/* Player cards */}
            <div className="flex gap-3 justify-center mb-6">
              {round?.you?.hand.map((card, index) => (
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
                  <span className="text-5xl text-[#4CC9F0] font-orbitron">
                    {card.value}
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
                disabled={!isYourTurn || round?.you?.stood}
                className="px-6 py-4 bg-gradient-to-r from-[#9D4EDD] to-[#8B3DC7] rounded-xl text-[#F5F5F5] text-lg tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  boxShadow: isYourTurn ? '0 0 30px rgba(157, 78, 221, 0.6)' : 'none'
                }}
              >
                <Plus className="w-5 h-5" />
                DRAW
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={sendStand}
                disabled={!isYourTurn || round?.you?.stood}
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
                Neural Modifiers ({you.powerUps.length})
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {you.powerUps.map((pu, i) => {
                  const config = POWER_UP_CONFIG[pu];
                  const Icon = config.icon;
                  return (
                    <motion.button
                      key={`${pu}-${i}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => usePowerUp(pu)}
                      disabled={!isYourTurn || round?.you?.powerUpUsedThisRound}
                      className="bg-[#121212] border border-[#4CC9F0]/40 rounded-lg p-3 flex flex-col items-center gap-2 hover:border-[#4CC9F0] hover:bg-[#4CC9F0]/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ boxShadow: '0 0 15px rgba(76, 201, 240, 0.2)' }}
                    >
                      <Icon className="w-6 h-6 text-[#4CC9F0]" />
                      <span className="text-[#B0B0B0] text-[10px] uppercase text-center">{config.label}</span>
                    </motion.button>
                  );
                })}
                {you.powerUps.length === 0 && (
                  <div className="col-span-4 py-4 text-center text-[#B0B0B0]/40 text-xs italic">
                    NO MODIFIERS AVAILABLE FOR THIS TURN
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`
        .font-orbitron { font-family: 'Orbitron', sans-serif; }
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
