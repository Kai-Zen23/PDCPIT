import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Users, Wifi, ArrowRight } from "lucide-react";
import { apiEnqueueMatchmaking } from "../../lib/backend";
import { clearSession, saveSession } from "../../lib/session";
import { useMatchConnection } from "../state/useMatch";

type MatchState = "name-entry" | "searching" | "found" | "connecting";

export function NameEntryMatchmaking() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("");
  const [matchState, setMatchState] = useState<MatchState>("name-entry");
  const [playersInQueue] = useState(Math.floor(Math.random() * 50) + 10);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const transitionedRef = useRef(false);

  // After we enqueue (and save session), we can use the same hook as Gameplay/Waiting.
  const { state, error } = useMatchConnection();

  useEffect(() => {
    if (matchState === "name-entry") return;
    if (!state) return;

    // When opponent exists, transition to found/connecting then go to game.
    if (state.status === "IN_PROGRESS" && state.opponent && !transitionedRef.current) {
      transitionedRef.current = true;
      setMatchState("found");
      const t1 = setTimeout(() => setMatchState("connecting"), 900);
      const t2 = setTimeout(() => navigate("/match-found"), 1800);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [matchState, navigate, state]);

  const handleEnterQueue = async () => {
    if (playerName.trim().length < 2) return;
    setLoading(true);
    setStatus("");
    transitionedRef.current = false;
    try {
      clearSession();
      const res = await apiEnqueueMatchmaking(playerName.trim());
      saveSession({ matchId: res.matchId, playerId: res.playerId, playerName: playerName.trim() });
      setMatchState("searching");
      setStatus(res.role === "CREATED" ? "Queued. Waiting for opponent..." : "Match found. Connecting...");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to enter queue.");
      setMatchState("name-entry");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setMatchState("name-entry");
    clearSession();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#121212] relative overflow-hidden" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Pulsing center glow */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#9D4EDD] opacity-15 blur-[150px] rounded-full"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
          }}
        />

        {/* Secondary cyan glow */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#4CC9F0] opacity-10 blur-[120px] rounded-full"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: 1.5,
          }}
        />

        {/* Scanning grid lines - only show during matchmaking */}
        {matchState !== "name-entry" && (
          <motion.div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(rgba(157, 78, 221, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(157, 78, 221, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
            }}
            animate={{
              backgroundPosition: ['0px 0px', '50px 50px'],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}
      </div>

      {/* Floating cards in background */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-16 h-24 bg-gradient-to-br from-[#1E1E1E] to-[#2A2A2A] rounded-lg border border-[#9D4EDD]/20 opacity-30"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -40, 0],
            rotate: [0, 10, -10, 0],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 8 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.7,
          }}
        />
      ))}

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Top - Game Title */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <motion.h1
            className="text-6xl text-[#F5F5F5] tracking-wider"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              textShadow: '0 0 40px rgba(157, 78, 221, 0.8), 0 0 80px rgba(157, 78, 221, 0.4)'
            }}
            animate={{
              textShadow: [
                '0 0 40px rgba(157, 78, 221, 0.8), 0 0 80px rgba(157, 78, 221, 0.4)',
                '0 0 50px rgba(157, 78, 221, 1), 0 0 100px rgba(157, 78, 221, 0.6)',
                '0 0 40px rgba(157, 78, 221, 0.8), 0 0 80px rgba(157, 78, 221, 0.4)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          >
            CARD CLASH 21
          </motion.h1>
        </motion.div>

        {/* Center - Name Entry OR Matchmaking Status */}
        <AnimatePresence mode="wait">
          {matchState === "name-entry" ? (
            <motion.div
              key="name-entry"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-md"
            >
              {/* Name Input Panel */}
              <div
                className="bg-[#1E1E1E]/80 backdrop-blur-xl border-2 border-[#9D4EDD]/40 rounded-2xl p-8"
                style={{ boxShadow: '0 0 60px rgba(157, 78, 221, 0.4)' }}
              >
                <div className="text-center mb-6">
                  <h2
                    className="text-3xl text-[#F5F5F5] mb-2"
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                  >
                    ENTER YOUR NAME
                  </h2>
                  <p className="text-[#B0B0B0] text-sm">
                    Choose your display name for this match
                  </p>
                </div>

                {/* Input field */}
                <div className="mb-6">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
                    onKeyPress={(e) => e.key === 'Enter' && handleEnterQueue()}
                    placeholder="e.g. Jerm, Shadow, Ace"
                    className="w-full bg-[#121212] border-2 border-[#9D4EDD]/40 rounded-xl px-6 py-4 text-[#F5F5F5] text-lg text-center placeholder:text-[#B0B0B0]/50 focus:border-[#4CC9F0] focus:outline-none transition-all"
                    style={{
                      fontFamily: 'Poppins, sans-serif',
                      boxShadow: '0 0 20px rgba(157, 78, 221, 0.2)',
                    }}
                    autoFocus
                  />
                  <p className="text-[#B0B0B0] text-xs mt-2 text-center">
                    {playerName.length}/20 characters
                  </p>
                </div>

                {/* Enter Queue Button */}
                <motion.button
                  whileHover={{ scale: playerName.trim().length >= 2 ? 1.02 : 1 }}
                  whileTap={{ scale: playerName.trim().length >= 2 ? 0.98 : 1 }}
                  onClick={handleEnterQueue}
                  disabled={loading || playerName.trim().length < 2}
                  className="w-full px-8 py-4 bg-gradient-to-r from-[#9D4EDD] to-[#8B3DC7] rounded-xl text-[#F5F5F5] text-lg tracking-wide disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    boxShadow: playerName.trim().length >= 2 ? '0 0 30px rgba(157, 78, 221, 0.6)' : 'none'
                  }}
                >
                  {loading ? "ENTERING..." : "ENTER QUEUE"}
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
                {status && <p className="text-[#B0B0B0] mt-4 text-center text-sm">{status}</p>}
                {error?.message && <p className="text-[#D62828] mt-2 text-center text-sm">{error.message}</p>}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/')}
                  className="w-full mt-3 px-8 py-3 bg-[#1E1E1E] border border-[#B0B0B0]/30 rounded-xl text-[#B0B0B0] text-sm tracking-wide hover:border-[#B0B0B0]/60 transition-all"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  BACK TO MENU
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="matchmaking"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              {/* Rotating energy rings */}
              <div className="relative mb-12">
                <motion.div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-[#9D4EDD]/30 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  style={{
                    borderTopColor: '#9D4EDD',
                    borderRightColor: 'transparent',
                    boxShadow: '0 0 40px rgba(157, 78, 221, 0.4)',
                  }}
                />
                <motion.div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-4 border-[#4CC9F0]/30 rounded-full"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                  style={{
                    borderBottomColor: '#4CC9F0',
                    borderLeftColor: 'transparent',
                    boxShadow: '0 0 30px rgba(76, 201, 240, 0.4)',
                  }}
                />
              </div>

              {/* Status text */}
              <motion.div className="mb-12">
                <h2
                  className="text-5xl text-[#F5F5F5] mb-4"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    textShadow: '0 0 30px rgba(157, 78, 221, 0.8)',
                  }}
                >
                  {matchState === "searching" && "SEARCHING FOR OPPONENT..."}
                  {matchState === "found" && "OPPONENT FOUND"}
                  {matchState === "connecting" && "CONNECTING TO SERVER..."}
                </h2>

                <motion.p
                  className="text-[#B0B0B0] text-lg mb-2"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {matchState === "searching" && "Waiting for another player to join"}
                  {matchState === "found" && "Match found. Finalizing connection..."}
                  {matchState === "connecting" && "Initializing duel..."}
                </motion.p>
                {status && <p className="text-[#B0B0B0] text-sm">{status}</p>}
                {error?.message && <p className="text-[#D62828] text-sm mt-2">{error.message}</p>}

                <p className="text-[#4CC9F0] text-sm" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  Playing as: {playerName}
                </p>

                {/* Animated dots */}
                <div className="flex justify-center gap-2 mt-6">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-3 h-3 bg-[#9D4EDD] rounded-full"
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.3,
                      }}
                      style={{ boxShadow: '0 0 10px #9D4EDD' }}
                    />
                  ))}
                </div>
              </motion.div>

              {/* Match status display */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[#1E1E1E]/80 backdrop-blur-xl border-2 border-[#9D4EDD]/40 rounded-2xl p-6 mb-8 max-w-md mx-auto"
                style={{ boxShadow: '0 0 60px rgba(157, 78, 221, 0.3)' }}
              >
                <div className="space-y-4">
                  {/* Players in queue */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-[#4CC9F0]" />
                      <span className="text-[#B0B0B0] text-sm">Players in Queue</span>
                    </div>
                    <span
                      className="text-xl text-[#4CC9F0]"
                      style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                      {playersInQueue}
                    </span>
                  </div>

                  {/* Match status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Wifi className="w-5 h-5 text-[#9D4EDD]" />
                      <span className="text-[#B0B0B0] text-sm">Match Status</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.div
                        className={`w-2 h-2 rounded-full ${
                          matchState === "searching" ? 'bg-[#4CC9F0]' :
                          matchState === "found" ? 'bg-[#2ECC71]' :
                          'bg-[#9D4EDD]'
                        }`}
                        animate={{
                          boxShadow: [
                            `0 0 10px ${matchState === "searching" ? '#4CC9F0' : matchState === "found" ? '#2ECC71' : '#9D4EDD'}`,
                            `0 0 20px ${matchState === "searching" ? '#4CC9F0' : matchState === "found" ? '#2ECC71' : '#9D4EDD'}`,
                            `0 0 10px ${matchState === "searching" ? '#4CC9F0' : matchState === "found" ? '#2ECC71' : '#9D4EDD'}`,
                          ],
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <span
                        className={`text-lg ${
                          matchState === "searching" ? 'text-[#4CC9F0]' :
                          matchState === "found" ? 'text-[#2ECC71]' :
                          'text-[#9D4EDD]'
                        }`}
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                      >
                        {matchState === "searching" && "1/2"}
                        {matchState === "found" && "2/2"}
                        {matchState === "connecting" && "READY"}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Cancel button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCancel}
                className="px-8 py-3 bg-[#1E1E1E] border-2 border-[#D62828]/60 rounded-xl text-[#D62828] tracking-wide hover:border-[#D62828] hover:bg-[#D62828]/10 transition-all"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  boxShadow: '0 0 20px rgba(214, 40, 40, 0.3)',
                }}
              >
                CANCEL QUEUE
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
