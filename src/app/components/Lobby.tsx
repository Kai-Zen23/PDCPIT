import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Copy, Users, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Sparkles, Check } from "lucide-react";
import { apiCreateMatch, apiJoinMatch } from "../../lib/backend";
import { clearSession, loadSession, saveSession } from "../../lib/session";
import { useMatchConnection, disconnectGlobalSocket } from "../state/useMatch";

export function Lobby() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialMode = (location.state as any)?.mode === "join" ? "join" : "create";

  const [activeTab, setActiveTab] = useState<"create" | "join">(initialMode);
  const [playerName, setPlayerName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  // Top-level hook execution for production safety
  const session = loadSession();
  const { state, error: socketError } = useMatchConnection();

  // If opponent joins, auto-navigate to the battlefield ready room
  useEffect(() => {
    if (session && state?.opponent) {
      const timer = setTimeout(() => {
        navigate("/game");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [session, state?.opponent, navigate]);

  const handleCreateRoom = async () => {
    if (playerName.trim().length < 2) {
      setErrorMsg("Display name must be at least 2 characters.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    setStatusMsg("");
    try {
      clearSession();
      // Passing true isolates this custom room from random online queues
      const res = await apiCreateMatch(playerName.trim(), true);
      saveSession({
        matchId: res.matchId,
        playerId: res.playerId,
        playerName: playerName.trim(),
      });
      setStatusMsg("Custom room established successfully.");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to establish room.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (playerName.trim().length < 2) {
      setErrorMsg("Display name must be at least 2 characters.");
      return;
    }
    const code = roomCodeInput.trim().toUpperCase();
    if (code.length < 1) {
      setErrorMsg("Please enter a valid room code.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    setStatusMsg("");
    try {
      clearSession();
      const res = await apiJoinMatch(code, playerName.trim());
      saveSession({
        matchId: res.matchId,
        playerId: res.playerId,
        playerName: playerName.trim(),
      });
      setStatusMsg("Successfully joined room. Teleporting...");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Room entry denied. Verify code.");
    } finally {
      setLoading(false);
    }
  };

  const copyRoomCode = () => {
    if (!session?.matchId) return;
    navigator.clipboard.writeText(session.matchId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    clearSession();
    disconnectGlobalSocket();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#121212] relative overflow-hidden" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Dynamic Background Glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#9D4EDD] opacity-10 blur-[150px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-[#4CC9F0] opacity-5 blur-[120px] rounded-full"></div>
      </div>

      {/* Floating Cards Background Deco */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-16 h-24 bg-gradient-to-br from-[#1E1E1E] to-[#2A2A2A] rounded-lg border border-[#9D4EDD]/20 opacity-30 pointer-events-none"
          style={{
            top: `${20 + i * 15}%`,
            left: `${10 + (i % 3) * 35}%`,
          }}
          animate={{
            y: [0, -30, 0],
            rotate: [0, 8, -8, 0],
          }}
          transition={{
            duration: 6 + i,
            repeat: Infinity,
            delay: i * 0.4,
          }}
        />
      ))}

      {/* Back/Leave Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleLeave}
        className="absolute top-8 left-8 z-20 px-4 py-2 bg-[#1E1E1E] border border-[#9D4EDD]/30 rounded-lg flex items-center gap-2 text-[#F5F5F5] hover:border-[#9D4EDD]/60 transition-colors shadow-lg"
      >
        <ArrowLeft className="w-5 h-5" />
        <span style={{ fontFamily: 'Orbitron, sans-serif' }}>{session ? "LEAVE ROOM" : "BACK"}</span>
      </motion.button>

      {/* Center Main Architecture */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-[#9D4EDD]" />
            <h1 className="text-5xl text-[#F5F5F5] tracking-wider font-orbitron" style={{ fontFamily: 'Orbitron, sans-serif', textShadow: '0 0 30px rgba(157,78,221,0.6)' }}>
              CUSTOM DUEL
            </h1>
            <Sparkles className="w-8 h-8 text-[#4CC9F0]" />
          </div>
          <p className="text-[#B0B0B0] text-sm tracking-widest uppercase">Private Peer-to-Peer Subnet</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!session ? (
            /* --- STATE 1: SETUP (CREATE OR JOIN) --- */
            <motion.div
              key="setup"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md"
            >
              <div className="bg-[#1E1E1E]/90 backdrop-blur-xl border-2 border-[#9D4EDD]/40 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(157,78,221,0.2)]">
                {/* Switch Tabs */}
                <div className="flex border-b border-[#9D4EDD]/20 bg-[#121212]/50">
                  <button
                    onClick={() => { setActiveTab("create"); setErrorMsg(""); setStatusMsg(""); }}
                    className={`flex-1 py-4 text-center text-sm font-orbitron tracking-wider transition-all relative ${activeTab === "create" ? "text-[#9D4EDD] bg-[#9D4EDD]/10" : "text-[#B0B0B0]/60 hover:text-[#B0B0B0]"}`}
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                  >
                    HOST ROOM
                    {activeTab === "create" && (
                      <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-1 bg-[#9D4EDD] shadow-[0_0_10px_#9D4EDD]" />
                    )}
                  </button>
                  <button
                    onClick={() => { setActiveTab("join"); setErrorMsg(""); setStatusMsg(""); }}
                    className={`flex-1 py-4 text-center text-sm font-orbitron tracking-wider transition-all relative ${activeTab === "join" ? "text-[#4CC9F0] bg-[#4CC9F0]/10" : "text-[#B0B0B0]/60 hover:text-[#B0B0B0]"}`}
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                  >
                    JOIN ROOM
                    {activeTab === "join" && (
                      <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-1 bg-[#4CC9F0] shadow-[0_0_10px_#4CC9F0]" />
                    )}
                  </button>
                </div>

                {/* Tab Forms */}
                <div className="p-8 space-y-6">
                  {/* Shared Player Name Input */}
                  <div>
                    <label className="block text-[#B0B0B0] text-xs uppercase tracking-widest mb-2 font-orbitron" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      DISPLAY NAME
                    </label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
                      placeholder="e.g. Maverick, Neo, Zero"
                      className="w-full bg-[#121212] border-2 border-[#9D4EDD]/40 rounded-xl px-5 py-3 text-[#F5F5F5] text-center text-lg placeholder:text-[#B0B0B0]/30 focus:border-[#4CC9F0] focus:outline-none transition-colors"
                    />
                  </div>

                  {activeTab === "join" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <label className="block text-[#B0B0B0] text-xs uppercase tracking-widest mb-2 font-orbitron" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                        ROOM ACCESS CODE
                      </label>
                      <input
                        type="text"
                        value={roomCodeInput}
                        onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase().slice(0, 10))}
                        placeholder="PASTE 8-CHAR CODE"
                        className="w-full bg-[#121212] border-2 border-[#4CC9F0]/50 rounded-xl px-5 py-3 text-[#4CC9F0] text-center text-xl tracking-[0.2em] font-orbitron placeholder:text-[#B0B0B0]/20 placeholder:tracking-normal focus:border-[#9D4EDD] focus:outline-none transition-colors"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                      />
                    </motion.div>
                  )}

                  {/* Errors / Feedback */}
                  {errorMsg && <p className="text-[#D62828] text-xs text-center bg-[#D62828]/10 py-2 rounded-lg border border-[#D62828]/20 animate-shake">{errorMsg}</p>}
                  {statusMsg && <p className="text-[#2ECC71] text-xs text-center bg-[#2ECC71]/10 py-2 rounded-lg border border-[#2ECC71]/20">{statusMsg}</p>}

                  {/* Submission triggers */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={activeTab === "create" ? handleCreateRoom : handleJoinRoom}
                    disabled={loading}
                    className={`w-full py-4 rounded-xl text-sm font-orbitron tracking-widest flex items-center justify-center gap-2 transition-all ${
                      activeTab === "create"
                        ? "bg-gradient-to-r from-[#9D4EDD] to-[#8B3DC7] text-white shadow-[0_0_20px_rgba(157,78,221,0.4)]"
                        : "bg-gradient-to-r from-[#4CC9F0] to-[#3AB5DC] text-[#121212] font-semibold shadow-[0_0_20px_rgba(76,201,240,0.4)]"
                    }`}
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>ESTABLISHING LINK...</span>
                      </>
                    ) : (
                      <>
                        <span>{activeTab === "create" ? "GENERATE LOBBY" : "ENTER LOBBY"}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* --- STATE 2: ACTIVE LOBBY ROOM WAITING SUBNET --- */
            <motion.div
              key="active-lobby"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-xl"
            >
              <div className="bg-[#1E1E1E]/90 backdrop-blur-xl border-2 border-[#9D4EDD]/50 rounded-2xl p-8 shadow-[0_0_80px_rgba(157,78,221,0.3)] relative">
                {/* Top Notification */}
                <div className="text-center mb-8">
                  <span className="px-3 py-1 bg-[#9D4EDD]/10 border border-[#9D4EDD]/30 rounded-full text-[#9D4EDD] text-xs font-orbitron tracking-wider inline-block mb-3" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    SECURE SUBNET HOSTED
                  </span>
                  <h2 className="text-2xl text-[#F5F5F5] font-orbitron tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    WAITING FOR PEER LINK
                  </h2>
                </div>

                {/* Room Code Display Hub */}
                <div className="bg-[#121212] border-2 border-[#9D4EDD]/40 rounded-xl p-5 mb-8 relative group">
                  <label className="block text-[#B0B0B0] text-[10px] uppercase tracking-widest mb-1 font-orbitron" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    SUBNET ACCESS ID (CLICK TO COPY)
                  </label>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-3xl text-[#4CC9F0] font-orbitron tracking-[0.3em] font-bold select-all" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      {session.matchId}
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={copyRoomCode}
                      className={`px-4 py-3 rounded-lg flex items-center gap-2 transition-colors ${copied ? "bg-[#2ECC71] text-white" : "bg-[#1E1E1E] text-[#B0B0B0] hover:text-white border border-[#B0B0B0]/20"}`}
                    >
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      <span className="text-xs font-orbitron tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                        {copied ? "COPIED" : "COPY"}
                      </span>
                    </motion.button>
                  </div>
                </div>

                {/* Active Connected Roster */}
                <div className="mb-8 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-[#9D4EDD]" />
                    <span className="text-[#B0B0B0] text-xs tracking-widest font-orbitron uppercase" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      NODE MAPPING ({state?.opponent ? "2" : "1"}/2)
                    </span>
                  </div>

                  {/* Player 1 (You) */}
                  <div className="bg-[#121212] border border-[#2ECC71]/30 rounded-xl px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#2ECC71] shadow-[0_0_8px_#2ECC71] animate-pulse"></div>
                      <span className="text-[#F5F5F5] font-medium">{state?.you.name || session.playerName}</span>
                      <span className="text-[10px] text-[#B0B0B0]/50 bg-[#1E1E1E] px-2 py-0.5 rounded border border-[#B0B0B0]/10 uppercase font-orbitron">YOU</span>
                    </div>
                    <span className="text-[#2ECC71] text-xs font-orbitron tracking-widest uppercase" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      AUTHENTICATED
                    </span>
                  </div>

                  {/* Player 2 (Opponent) */}
                  <div className={`bg-[#121212] border rounded-xl px-5 py-4 flex items-center justify-between transition-all duration-500 ${state?.opponent ? "border-[#2ECC71]/30" : "border-[#9D4EDD]/20 border-dashed"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${state?.opponent ? "bg-[#2ECC71] shadow-[0_0_8px_#2ECC71]" : "bg-[#B0B0B0]/30 animate-pulse"}`}></div>
                      <span className={state?.opponent ? "text-[#F5F5F5] font-medium" : "text-[#B0B0B0]/60 italic"}>
                        {state?.opponent ? state.opponent.name : "Awaiting opponent authentication..."}
                      </span>
                    </div>
                    <span className={`text-xs font-orbitron tracking-widest uppercase ${state?.opponent ? "text-[#2ECC71]" : "text-[#B0B0B0]/40"}`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      {state?.opponent ? "LINKED" : "LISTENING"}
                    </span>
                  </div>
                </div>

                {socketError?.message && (
                  <p className="text-[#D62828] text-xs text-center bg-[#D62828]/10 py-2 rounded-lg border border-[#D62828]/20 mb-4">
                    {socketError.message}
                  </p>
                )}

                {/* Transition Feedback Banner */}
                {state?.opponent ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-[#2ECC71]/20 to-[#27AE60]/20 border-2 border-[#2ECC71] rounded-xl p-4 text-center mb-4 shadow-[0_0_30px_rgba(46,204,113,0.3)]"
                  >
                    <div className="flex items-center justify-center gap-2 text-[#2ECC71] font-orbitron tracking-wider mb-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                      <CheckCircle2 className="w-5 h-5 animate-bounce" />
                      <span>PEER PAIRING VERIFIED</span>
                    </div>
                    <p className="text-white text-xs opacity-90">Auto-navigating to synchronized battle arena...</p>
                  </motion.div>
                ) : null}

                {/* Immediate manual launcher option */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/game")}
                  className={`w-full py-4 rounded-xl text-sm font-orbitron tracking-widest transition-all ${
                    state?.opponent
                      ? "bg-[#2ECC71] text-[#121212] font-bold shadow-[0_0_30px_rgba(46,204,113,0.5)]"
                      : "bg-[#1E1E1E] text-[#B0B0B0]/40 border border-[#B0B0B0]/10 hover:border-[#9D4EDD]/40 hover:text-[#B0B0B0]"
                  }`}
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  {state?.opponent ? "ENTER BATTLEFIELD NOW" : "ENTER ARENA (DEV OVERRIDE)"}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
