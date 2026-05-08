import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Swords, Zap } from "lucide-react";

export function MatchFound() {
  const navigate = useNavigate();
  const [playerAlias] = useState(`PLAYER-${Math.floor(Math.random() * 99) + 1}`);
  const [opponentAlias] = useState(`SPECTER-${Math.floor(Math.random() * 99) + 1}`);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/game');
    }, 4000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#121212] relative overflow-hidden" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Cyan flash overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.6, 0] }}
        transition={{ duration: 0.8 }}
        className="absolute inset-0 bg-[#4CC9F0] mix-blend-screen z-50 pointer-events-none"
      />

      {/* Glitch effect overlay */}
      <motion.div
        className="absolute inset-0 z-40 pointer-events-none"
        animate={{
          opacity: [0, 0.3, 0, 0.2, 0],
          x: [0, -5, 5, -3, 3, 0],
        }}
        transition={{
          duration: 0.5,
          repeat: 2,
          delay: 0.5,
        }}
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(157, 78, 221, 0.3) 50%, transparent 100%)',
        }}
      />

      {/* Energy burst background */}
      <div className="absolute inset-0">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 3, opacity: [0, 0.4, 0] }}
          transition={{ duration: 2 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#9D4EDD] blur-[150px] rounded-full"
        />
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 2.5, opacity: [0, 0.5, 0] }}
          transition={{ duration: 2, delay: 0.2 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#4CC9F0] blur-[150px] rounded-full"
        />
      </div>

      {/* Card shuffle animation */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-20 h-28 bg-gradient-to-br from-[#1E1E1E] to-[#2A2A2A] border-2 border-[#9D4EDD] rounded-xl"
            initial={{
              x: '50vw',
              y: '50vh',
              rotate: 0,
              opacity: 0,
            }}
            animate={{
              x: `${Math.random() * 100}vw`,
              y: `${Math.random() * 100}vh`,
              rotate: Math.random() * 360,
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              delay: i * 0.1,
              ease: "easeOut",
            }}
            style={{
              boxShadow: '0 0 30px rgba(157, 78, 221, 0.6)',
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-30 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Top section - "OPPONENT FOUND" */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
          >
            <h1
              className="text-6xl text-[#4CC9F0] mb-4"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                textShadow: '0 0 50px rgba(76, 201, 240, 1), 0 0 100px rgba(76, 201, 240, 0.6)',
              }}
            >
              OPPONENT FOUND
            </h1>
          </motion.div>
        </motion.div>

        {/* Player vs Opponent display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="flex items-center gap-12 mb-16"
        >
          {/* Player card */}
          <motion.div
            className="bg-[#1E1E1E]/90 backdrop-blur-xl border-2 border-[#4CC9F0] rounded-2xl p-8 min-w-[240px]"
            style={{ boxShadow: '0 0 60px rgba(76, 201, 240, 0.5)' }}
            animate={{
              boxShadow: [
                '0 0 60px rgba(76, 201, 240, 0.5)',
                '0 0 80px rgba(76, 201, 240, 0.7)',
                '0 0 60px rgba(76, 201, 240, 0.5)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="text-center">
              <div className="text-[#B0B0B0] text-sm uppercase tracking-wide mb-3">
                You Are
              </div>
              <div
                className="text-3xl text-[#4CC9F0] tracking-wider"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {playerAlias}
              </div>
            </div>
          </motion.div>

          {/* VS icon */}
          <motion.div
            initial={{ rotate: 0, scale: 0 }}
            animate={{ rotate: 360, scale: 1 }}
            transition={{ delay: 1.5, duration: 0.8, type: "spring" }}
            className="relative"
          >
            <Swords
              className="w-16 h-16 text-[#9D4EDD]"
              style={{ filter: 'drop-shadow(0 0 30px #9D4EDD)' }}
            />
            <motion.div
              className="absolute -inset-4 border-4 border-[#9D4EDD]/30 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>

          {/* Opponent card */}
          <motion.div
            className="bg-[#1E1E1E]/90 backdrop-blur-xl border-2 border-[#9D4EDD] rounded-2xl p-8 min-w-[240px]"
            style={{ boxShadow: '0 0 60px rgba(157, 78, 221, 0.5)' }}
            animate={{
              boxShadow: [
                '0 0 60px rgba(157, 78, 221, 0.5)',
                '0 0 80px rgba(157, 78, 221, 0.7)',
                '0 0 60px rgba(157, 78, 221, 0.5)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          >
            <div className="text-center">
              <div className="text-[#B0B0B0] text-sm uppercase tracking-wide mb-3">
                Opponent
              </div>
              <div
                className="text-3xl text-[#9D4EDD] tracking-wider"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {opponentAlias}
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Initializing text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Zap className="w-6 h-6 text-[#4CC9F0]" />
            </motion.div>
            <p className="text-2xl text-[#F5F5F5]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              INITIALIZING DUEL
            </p>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Zap className="w-6 h-6 text-[#9D4EDD]" />
            </motion.div>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-[#9D4EDD] rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
                style={{ boxShadow: '0 0 8px #9D4EDD' }}
              />
            ))}
          </div>
        </motion.div>

        {/* Energy pulse effect */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border-2 border-[#9D4EDD]/20 rounded-full pointer-events-none"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border-2 border-[#4CC9F0]/20 rounded-full pointer-events-none"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: 1,
          }}
        />
      </div>
    </div>
  );
}
