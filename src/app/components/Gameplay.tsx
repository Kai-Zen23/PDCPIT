import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { 
  Heart, Plus, Minus, Target, Zap, Trash2, Scissors, 
  Eraser, Shield, Repeat, TrendingUp, Search, Trophy,
  XCircle, CheckCircle2, RotateCcw, RefreshCw, Swords,
  Wifi, ArrowRight
} from "lucide-react";
import { useMatchConnection } from "../state/useMatch";
import type { BackendPowerUp, MatchEvent } from "../../lib/backend";

const POWER_UP_CONFIG: Record<BackendPowerUp, { icon: any, label: string }> = {
  card_destroyer: { icon: Trash2, label: "Card Destroyer" },
  rightmost_removal: { icon: Scissors, label: "Opp Removal" },
  self_cleanse: { icon: Eraser, label: "Self Cleanse" },
  double_purge: { icon: RefreshCw, label: "Double Purge" },
  target_shift_19: { icon: Target, label: "Target 19" },
  target_shift_21: { icon: Target, label: "Target 21" },
  target_shift_28: { icon: Target, label: "Target 28" },
  shield: { icon: Shield, label: "Shield" },
  random_swap: { icon: Repeat, label: "Random Swap" },
  sudden_risk: { icon: TrendingUp, label: "Sudden Risk" },
  lucky_replace: { icon: RotateCcw, label: "Lucky Replace" },
};

export function Gameplay() {
  const navigate = useNavigate();
  const { 
    state: liveState, events, error, isYourTurn, 
    sendDraw, sendStand, sendNextRound, usePowerUp 
  } = useMatchConnection();
  
  // Latched state for round results
  const [roundResults, setRoundResults] = useState<any | null>(null);

  // Clock synchronization state
  const [clockOffset, setClockOffset] = useState(0);
  
  // Use results if available, otherwise live state
  const state = roundResults || liveState;

  // Update clock offset whenever we get a fresh server timestamp
  useEffect(() => {
    if (liveState?.serverTime) {
      setClockOffset(liveState.serverTime - Date.now());
    }
  }, [liveState?.serverTime]);

  // Detect round end to show results
  useEffect(() => {
    if (liveState?.round?.ended && !roundResults) {
      setRoundResults(liveState);
    }
    // Auto-clear results when a new round starts (indicated by round.ended being false in the live state)
    if (liveState?.round && !liveState.round.ended && roundResults) {
      setRoundResults(null);
    }
  }, [liveState, roundResults]);

  // State for power-ups that require targeting a specific card
  const [pendingPowerUp, setPendingPowerUp] = useState<{ type: BackendPowerUp; indexInYourPowerUps: number } | null>(null);

  // Store timestamps at the moment events arrive, not at render time
  const [timedEvents, setTimedEvents] = useState<Array<{ event: MatchEvent; ts: string }>>([]);

  useEffect(() => {
    if (events.length === 0) return;
    // Sync timedEvents with the latest events list, adding ts for new ones
    setTimedEvents((prev) => {
      const prevLen = prev.length;
      const newEvents = events.slice(0, events.length - prevLen);
      const now = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return [
        ...newEvents.map((e) => ({ event: e, ts: now })),
        ...prev,
      ].slice(0, 50);
    });
  }, [events]);

  // Countdown timer state
  const [timeLeft, setLeft] = useState(15);

  useEffect(() => {
    if (!state?.round || state.round.ended) return;

    const interval = setInterval(() => {
      const adjustedNow = Date.now() + clockOffset;
      const elapsed = adjustedNow - state.round.turnStartedAt;
      const remaining = Math.max(0, 15 - Math.floor(elapsed / 1000));
      setLeft(remaining);
    }, 200);

    return () => clearInterval(interval);
  }, [state?.round?.turnStartedAt, state?.round?.ended, clockOffset]);

  useEffect(() => {
    if (state?.status === "FINISHED") {
      // Check the match-level winner: find which player still has lives > 0.
      // We can't rely on round?.winnerPlayerId because the last round might be a tie.
      const you = state.you;
      const opponent = state.opponent;
      const youAlive = you.lives > 0;
      const oppAlive = opponent ? opponent.lives > 0 : false;
      if (youAlive && !oppAlive) {
        navigate("/victory");
      } else {
        navigate("/defeat");
      }
    }
  }, [state?.status, state?.you.lives, state?.opponent?.lives, navigate]);

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
              {round?.opponent?.hand.map((card, index) => {
                const isTargetable = pendingPowerUp?.type === "card_destroyer";
                return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                    animate={{ 
                      opacity: 1, 
                      scale: isTargetable ? [1, 1.05, 1] : 1, 
                      rotateY: 0,
                      borderColor: isTargetable ? "#FF0000" : (!card.hidden ? "#9D4EDD" : "rgba(176, 176, 176, 0.3)")
                    }}
                    transition={{ 
                      delay: index * 0.1,
                      scale: { repeat: isTargetable ? Infinity : 0, duration: 1 }
                    }}
                    onClick={() => {
                      if (isTargetable) {
                        usePowerUp("card_destroyer", { targetCardIndex: index });
                        setPendingPowerUp(null);
                      }
                    }}
                    className={`w-20 h-28 rounded-xl flex items-center justify-center relative ${
                      isTargetable ? 'cursor-crosshair' : ''
                    } ${
                      !card.hidden
                        ? 'bg-gradient-to-br from-[#1E1E1E] to-[#2A2A2A] border-2'
                        : 'bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] border-2'
                    }`}
                    style={{
                      boxShadow: isTargetable ? '0 0 30px rgba(255, 0, 0, 0.6)' : (!card.hidden ? '0 0 20px rgba(157, 78, 221, 0.5)' : 'none')
                    }}
                  >
                    {!card.hidden ? (
                      <span className="text-4xl text-[#9D4EDD] font-orbitron">
                        {card.value}
                      </span>
                    ) : (
                      <span className="text-4xl text-[#B0B0B0]">?</span>
                    )}
                    {isTargetable && (
                      <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center">
                        <div className="w-1 h-8 bg-red-500 rotate-45 absolute" />
                        <div className="w-1 h-8 bg-red-500 -rotate-45 absolute" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
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
        <div className="flex items-center justify-center px-6 py-4">
          <div className="grid grid-cols-2 gap-8 w-full max-w-4xl">
            {/* Target number */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#1E1E1E]/40 backdrop-blur-md border border-[#9D4EDD]/30 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden"
            >
              {/* Target */}
              <div className="text-center mb-6">
                <p className="text-[#B0B0B0] text-[10px] uppercase tracking-[0.3em] mb-1">Target Node</p>
                <div
                  className="text-7xl text-[#9D4EDD] font-orbitron leading-none"
                  style={{ textShadow: '0 0 30px rgba(157, 78, 221, 0.8)' }}
                >
                  {round?.target ?? 21}
                </div>
              </div>

              {/* Timer */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${isYourTurn ? 'bg-[#2ECC71]' : 'bg-[#B0B0B0]'} animate-pulse`} />
                  <span className="text-[10px] text-[#B0B0B0] uppercase tracking-[0.2em]">
                    {isYourTurn ? 'Your Sync' : 'Opponent Sync'}
                  </span>
                </div>
                <div 
                  className={`text-5xl font-orbitron leading-none transition-colors ${timeLeft <= 5 ? 'text-[#D62828] animate-pulse' : 'text-[#4CC9F0]'}`}
                  style={{ 
                    textShadow: timeLeft <= 5 
                      ? '0 0 30px rgba(214, 40, 40, 0.6)' 
                      : '0 0 30px rgba(76, 201, 240, 0.4)' 
                  }}
                >
                  00:{timeLeft.toString().padStart(2, '0')}
                </div>
              </div>

              {/* Scanning effect */}
              <motion.div
                className="absolute inset-x-0 h-[1px] bg-[#9D4EDD]/30"
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>

            {/* Action log */}
            <div className="bg-[#1E1E1E]/60 backdrop-blur-sm border border-[#9D4EDD]/30 rounded-xl p-4">
              <h4 className="text-[#9D4EDD] mb-2 text-xs uppercase tracking-wide flex items-center gap-2">
                <div className="w-2 h-2 bg-[#9D4EDD] rounded-full animate-pulse"></div>
                Neural Action Stream
              </h4>
              <div className="h-28 overflow-y-auto custom-scrollbar space-y-1">
                <AnimatePresence mode="popLayout">
                  {timedEvents.slice(0, 5).map(({ event, ts }, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-[#B0B0B0] text-xs font-mono truncate"
                    >
                      <span className="text-[#4CC9F0]">[{ts}]</span> {event.type}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {error && (
                  <div className="text-red-400 text-xs mt-1 p-1 bg-red-900/20 border border-red-900/50 rounded italic truncate">
                    ERR: {error.message}
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
              {round?.you?.hand.map((card, index) => {
                const isTargetable = pendingPowerUp?.type === "lucky_replace";
                return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, scale: 0.8, y: 50 }}
                    animate={{ 
                      opacity: 1, 
                      scale: isTargetable ? [1, 1.05, 1] : 1, 
                      y: 0,
                      borderColor: isTargetable ? "#4CC9F0" : "#4CC9F0" 
                    }}
                    transition={{ 
                      delay: index * 0.1,
                      scale: { repeat: isTargetable ? Infinity : 0, duration: 1 }
                    }}
                    onClick={() => {
                      if (isTargetable) {
                        usePowerUp("lucky_replace", { discardIndex: index });
                        setPendingPowerUp(null);
                      }
                    }}
                    className={`w-24 h-36 bg-gradient-to-br from-[#1E1E1E] to-[#2A2A2A] border-2 border-[#4CC9F0] rounded-xl flex items-center justify-center relative ${isTargetable ? 'cursor-pointer' : ''}`}
                    style={{
                      boxShadow: isTargetable ? '0 0 40px rgba(76, 201, 240, 0.8)' : '0 0 25px rgba(76, 201, 240, 0.6)'
                    }}
                  >
                    <span className="text-5xl text-[#4CC9F0] font-orbitron">
                      {card.value}
                    </span>
                    {isTargetable && (
                      <div className="absolute inset-0 bg-[#4CC9F0]/10 flex items-center justify-center">
                        <Zap className="w-10 h-10 text-[#4CC9F0]" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
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
                  const isPending = pendingPowerUp?.indexInYourPowerUps === i;
                  const needsTargeting = pu === "card_destroyer" || pu === "lucky_replace";

                  return (
                    <motion.button
                      key={`${pu}-${i}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (needsTargeting) {
                          if (isPending) setPendingPowerUp(null);
                          else setPendingPowerUp({ type: pu, indexInYourPowerUps: i });
                        } else {
                          usePowerUp(pu);
                        }
                      }}
                      disabled={!isYourTurn || round?.you?.powerUpUsedThisRound}
                      className={`bg-[#121212] border rounded-lg p-3 flex flex-col items-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                        isPending 
                          ? 'border-[#9D4EDD] bg-[#9D4EDD]/20 animate-pulse' 
                          : 'border-[#4CC9F0]/40 hover:border-[#4CC9F0] hover:bg-[#4CC9F0]/10'
                      }`}
                      style={{ boxShadow: isPending ? '0 0 20px #9D4EDD' : '0 0 15px rgba(76, 201, 240, 0.2)' }}
                    >
                      <Icon className={`w-6 h-6 ${isPending ? 'text-[#9D4EDD]' : 'text-[#4CC9F0]'}`} />
                      <span className={`text-[10px] uppercase text-center ${isPending ? 'text-[#F5F5F5]' : 'text-[#B0B0B0]'}`}>
                        {isPending ? "SELECT TARGET" : config.label}
                      </span>
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

      <AnimatePresence>
        {roundResults && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-[#1E1E1E] border-2 border-[#9D4EDD] rounded-3xl p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(157,78,221,0.5)]"
            >
              <div className="mb-6">
                {roundResults.round.winnerPlayerId === state.you.playerId ? (
                  <div className="flex flex-col items-center gap-4">
                    <Trophy className="w-16 h-16 text-[#FFD700] drop-shadow-[0_0_15px_rgba(255,215,0,0.6)]" />
                    <h2 className="text-3xl font-orbitron text-[#2ECC71]">ROUND WON!</h2>
                  </div>
                ) : roundResults.round.winnerPlayerId === null ? (
                  <div className="flex flex-col items-center gap-4">
                    <CheckCircle2 className="w-16 h-16 text-[#B0B0B0]" />
                    <h2 className="text-3xl font-orbitron text-[#F5F5F5]">ROUND TIE</h2>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <XCircle className="w-16 h-16 text-[#D62828] drop-shadow-[0_0_15px_rgba(214,40,40,0.6)]" />
                    <h2 className="text-3xl font-orbitron text-[#D62828]">ROUND LOST</h2>
                  </div>
                )}
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center p-4 bg-[#121212] rounded-xl border border-[#4CC9F0]/30">
                  <span className="text-[#B0B0B0] uppercase text-xs tracking-widest">You</span>
                  <span className="text-2xl font-orbitron text-[#4CC9F0]">{roundResults.round.you.totalActual}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-[#121212] rounded-xl border border-[#9D4EDD]/30">
                  <span className="text-[#B0B0B0] uppercase text-xs tracking-widest">Opponent</span>
                  <span className="text-2xl font-orbitron text-[#9D4EDD]">{roundResults.round.opponent.totalVisible}</span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => sendNextRound()}
                className="w-full py-4 bg-gradient-to-r from-[#9D4EDD] to-[#4CC9F0] rounded-xl text-white font-orbitron text-lg tracking-wider shadow-lg shadow-[#9D4EDD]/20 flex items-center justify-center gap-2"
              >
                CONTINUE
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
