import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Skull, Home, RotateCcw } from "lucide-react";

export function Defeat() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#121212] relative overflow-hidden flex items-center justify-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Animated background - red theme */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#D62828] opacity-20 blur-[150px] rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        ></motion.div>
        <div className="absolute top-20 left-20 w-96 h-96 bg-[#D62828] opacity-15 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#9D4EDD] opacity-10 blur-[120px] rounded-full"></div>
      </div>

      {/* Glitch effect overlay */}
      <motion.div
        className="absolute inset-0 bg-[#D62828] mix-blend-multiply"
        animate={{
          opacity: [0, 0.1, 0, 0.15, 0],
        }}
        transition={{
          duration: 0.3,
          repeat: Infinity,
          repeatDelay: 2,
        }}
      ></motion.div>

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        {/* Skull icon with glitch */}
        <motion.div
          initial={{ scale: 0, rotate: 180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 1, bounce: 0.3 }}
          className="inline-block mb-8 relative"
        >
          <motion.div
            animate={{
              x: [0, -4, 4, -2, 2, 0],
              opacity: [1, 0.8, 1, 0.9, 1],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatDelay: 3,
            }}
          >
            <Skull
              className="w-32 h-32 text-[#D62828]"
              style={{ filter: 'drop-shadow(0 0 40px #D62828)' }}
            />
          </motion.div>
        </motion.div>

        {/* Defeat text with glitch */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative"
        >
          <motion.h1
            animate={{
              textShadow: [
                '0 0 50px rgba(214, 40, 40, 1), 0 0 100px rgba(214, 40, 40, 0.6)',
                '2px 2px 0 rgba(214, 40, 40, 0.8), -2px -2px 0 rgba(76, 201, 240, 0.4)',
                '0 0 50px rgba(214, 40, 40, 1), 0 0 100px rgba(214, 40, 40, 0.6)',
              ],
            }}
            transition={{
              duration: 0.3,
              repeat: Infinity,
              repeatDelay: 4,
            }}
            className="text-7xl text-[#D62828] mb-4"
            style={{
              fontFamily: 'Orbitron, sans-serif',
            }}
          >
            DEFEAT
          </motion.h1>
          <p className="text-2xl text-[#F5F5F5] mb-2">You went bust!</p>
          <p className="text-[#B0B0B0] text-lg mb-12">
            Final Score: <span className="text-[#D62828]" style={{ fontFamily: 'Orbitron, sans-serif' }}>BUST</span>
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="inline-block bg-[#1E1E1E]/80 backdrop-blur-xl border-2 border-[#D62828]/40 rounded-2xl p-8 mb-12"
          style={{ boxShadow: '0 0 60px rgba(214, 40, 40, 0.3)' }}
        >
          <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="text-4xl text-[#D62828] mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                25
              </div>
              <div className="text-[#B0B0B0] text-sm uppercase">Final Total</div>
            </div>
            <div>
              <div className="text-4xl text-[#B0B0B0] mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                12
              </div>
              <div className="text-[#B0B0B0] text-sm uppercase">Cards Drawn</div>
            </div>
            <div>
              <div className="text-4xl text-[#9D4EDD] mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                3
              </div>
              <div className="text-[#B0B0B0] text-sm uppercase">Rounds Played</div>
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
            className="px-8 py-4 bg-gradient-to-r from-[#D62828] to-[#B91F1F] rounded-xl text-[#F5F5F5] text-lg tracking-wide flex items-center gap-2"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              boxShadow: '0 0 30px rgba(214, 40, 40, 0.6)'
            }}
          >
            <RotateCcw className="w-5 h-5" />
            TRY AGAIN
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

        {/* Glitch text effect */}
        <motion.p
          animate={{
            opacity: [0, 0.5, 0],
            x: [0, -2, 2, -1, 1, 0],
          }}
          transition={{
            duration: 0.4,
            repeat: Infinity,
            repeatDelay: 5,
          }}
          className="mt-8 text-[#D62828] text-sm uppercase tracking-widest"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          SYSTEM ERROR // RECALIBRATING
        </motion.p>
      </div>
    </div>
  );
}
