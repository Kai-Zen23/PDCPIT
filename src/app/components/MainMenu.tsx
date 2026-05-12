import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { useEffect } from "react";
import { clearSession } from "../../lib/session";
import { disconnectGlobalSocket } from "../state/useMatch";

export function MainMenu() {
  const navigate = useNavigate();

  useEffect(() => {
    clearSession();
    disconnectGlobalSocket();
  }, []);

  return (
    <div className="min-h-screen bg-[#121212] relative overflow-hidden" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-[#9D4EDD] opacity-20 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#4CC9F0] opacity-20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#9D4EDD] opacity-10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Floating cards */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-20 h-28 bg-gradient-to-br from-[#1E1E1E] to-[#2A2A2A] rounded-lg border border-[#9D4EDD]/30 shadow-[0_0_20px_rgba(157,78,221,0.3)]"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            rotate: [0, 5, -5, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 5 + i,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        />
      ))}

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <Sparkles className="w-10 h-10 text-[#9D4EDD]" />
            <h1
              className="text-7xl tracking-wider text-[#F5F5F5]"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                textShadow: '0 0 30px rgba(157, 78, 221, 0.8), 0 0 60px rgba(157, 78, 221, 0.4)'
              }}
            >
              CARD CLASH
            </h1>
            <Sparkles className="w-10 h-10 text-[#4CC9F0]" />
          </div>
          <div
            className="text-8xl tracking-widest text-[#9D4EDD]"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              textShadow: '0 0 40px rgba(157, 78, 221, 1), 0 0 80px rgba(157, 78, 221, 0.6)'
            }}
          >
            21
          </div>
          <p className="text-[#B0B0B0] mt-4 text-lg">MASTER THE ODDS. DOMINATE THE TABLE.</p>
        </motion.div>

        {/* Menu buttons */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-col gap-4 w-full max-w-md"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/matchmaking')}
            className="relative px-8 py-5 bg-gradient-to-r from-[#9D4EDD] to-[#8B3DC7] rounded-xl overflow-hidden group"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              boxShadow: '0 0 30px rgba(157, 78, 221, 0.6), 0 4px 20px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#B36BF0] to-[#9D4EDD] opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative text-2xl text-[#F5F5F5] tracking-wide">PLAY NOW</span>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute inset-0 bg-[#9D4EDD] blur-xl opacity-50"></div>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/lobby', { state: { mode: 'create' } })}
            className="relative px-8 py-4 bg-[#1E1E1E] border-2 border-[#9D4EDD]/50 rounded-xl overflow-hidden group"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              boxShadow: '0 0 20px rgba(157, 78, 221, 0.3)'
            }}
          >
            <div className="absolute inset-0 bg-[#9D4EDD]/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative text-xl text-[#F5F5F5] tracking-wide">CREATE ROOM</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/lobby', { state: { mode: 'join' } })}
            className="relative px-8 py-4 bg-[#1E1E1E] border-2 border-[#4CC9F0]/50 rounded-xl overflow-hidden group cursor-pointer"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              boxShadow: '0 0 20px rgba(76, 201, 240, 0.3)'
            }}
          >
            <div className="absolute inset-0 bg-[#4CC9F0]/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative text-xl text-[#F5F5F5] tracking-wide">JOIN ROOM</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/manual')}
            className="relative px-8 py-4 bg-[#1E1E1E] border-2 border-[#2ECC71]/50 rounded-xl overflow-hidden group cursor-pointer"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              boxShadow: '0 0 20px rgba(46, 204, 113, 0.3)'
            }}
          >
            <div className="absolute inset-0 bg-[#2ECC71]/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative text-xl text-[#F5F5F5] tracking-wide">HOW TO PLAY</span>
          </motion.button>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="absolute bottom-8 text-center text-[#B0B0B0] text-sm"
        >
          <p>A multiplayer strategy card game</p>
        </motion.div>
      </div>
    </div>
  );
}
