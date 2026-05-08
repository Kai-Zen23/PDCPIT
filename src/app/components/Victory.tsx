import { useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Trophy, Home, RotateCcw, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

export function Victory() {
  const navigate = useNavigate();

  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ['#9D4EDD', '#4CC9F0', '#2ECC71'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ['#9D4EDD', '#4CC9F0', '#2ECC71'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <div className="min-h-screen bg-[#121212] relative overflow-hidden flex items-center justify-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Animated background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#2ECC71] opacity-20 blur-[150px] rounded-full"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.35, 0.2],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        ></motion.div>
        <div className="absolute top-20 left-20 w-96 h-96 bg-[#9D4EDD] opacity-15 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#4CC9F0] opacity-15 blur-[120px] rounded-full"></div>
      </div>

      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-[#2ECC71] rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [-20, -100],
            opacity: [1, 0],
            scale: [1, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        {/* Trophy icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 1, bounce: 0.5 }}
          className="inline-block mb-8"
        >
          <div className="relative">
            <Trophy
              className="w-32 h-32 text-[#2ECC71]"
              style={{ filter: 'drop-shadow(0 0 40px #2ECC71)' }}
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute -top-4 -right-4"
            >
              <Sparkles className="w-12 h-12 text-[#4CC9F0]" />
            </motion.div>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute -bottom-4 -left-4"
            >
              <Sparkles className="w-10 h-10 text-[#9D4EDD]" />
            </motion.div>
          </div>
        </motion.div>

        {/* Victory text */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1
            className="text-7xl text-[#2ECC71] mb-4"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              textShadow: '0 0 50px rgba(46, 204, 113, 1), 0 0 100px rgba(46, 204, 113, 0.6)'
            }}
          >
            VICTORY
          </h1>
          <p className="text-2xl text-[#F5F5F5] mb-2">You dominated the table!</p>
          <p className="text-[#B0B0B0] text-lg mb-12">
            Final Score: <span className="text-[#4CC9F0]" style={{ fontFamily: 'Orbitron, sans-serif' }}>21</span>
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="inline-block bg-[#1E1E1E]/80 backdrop-blur-xl border-2 border-[#2ECC71]/40 rounded-2xl p-8 mb-12"
          style={{ boxShadow: '0 0 60px rgba(46, 204, 113, 0.3)' }}
        >
          <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="text-4xl text-[#2ECC71] mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                18
              </div>
              <div className="text-[#B0B0B0] text-sm uppercase">Cards Drawn</div>
            </div>
            <div>
              <div className="text-4xl text-[#4CC9F0] mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                5
              </div>
              <div className="text-[#B0B0B0] text-sm uppercase">Rounds Won</div>
            </div>
            <div>
              <div className="text-4xl text-[#9D4EDD] mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                2
              </div>
              <div className="text-[#B0B0B0] text-sm uppercase">Power-Ups Used</div>
            </div>
          </div>
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex gap-4 justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/matchmaking')}
            className="px-8 py-4 bg-gradient-to-r from-[#2ECC71] to-[#27AE60] rounded-xl text-[#F5F5F5] text-lg tracking-wide flex items-center gap-2"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              boxShadow: '0 0 30px rgba(46, 204, 113, 0.6)'
            }}
          >
            <RotateCcw className="w-5 h-5" />
            PLAY AGAIN
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="px-8 py-4 bg-[#1E1E1E] border-2 border-[#9D4EDD]/50 rounded-xl text-[#F5F5F5] text-lg tracking-wide flex items-center gap-2 hover:border-[#9D4EDD]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            <Home className="w-5 h-5" />
            MAIN MENU
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
