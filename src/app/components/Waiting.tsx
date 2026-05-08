import { useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { loadSession } from "../../lib/session";
import { useMatchConnection } from "../state/useMatch";

export function Waiting() {
  const navigate = useNavigate();
  const session = loadSession();
  const { state, error } = useMatchConnection();

  useEffect(() => {
    if (!session) {
      navigate("/lobby");
      return;
    }
    if (state?.status === "IN_PROGRESS" && state.opponent) {
      navigate("/game");
    }
  }, [navigate, session, state?.status, state?.opponent]);

  return (
    <div className="min-h-screen bg-[#121212] relative overflow-hidden flex items-center justify-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Animated background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#9D4EDD] opacity-20 blur-[120px] rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        ></motion.div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center">
        {/* Spinner */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="inline-block mb-8"
        >
          <Loader2 className="w-20 h-20 text-[#9D4EDD]" style={{ filter: 'drop-shadow(0 0 20px #9D4EDD)' }} />
        </motion.div>

        {/* Text */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl text-[#F5F5F5] mb-4"
          style={{
            fontFamily: 'Orbitron, sans-serif',
            textShadow: '0 0 20px rgba(157, 78, 221, 0.6)'
          }}
        >
          FINDING OPPONENT
        </motion.h2>

        {/* Dots animation */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 bg-[#9D4EDD] rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              style={{ boxShadow: '0 0 10px #9D4EDD' }}
            />
          ))}
        </div>

        <p className="text-[#B0B0B0] text-lg">Preparing the battlefield...</p>
        {error?.message && <p className="text-[#D62828] mt-4">{error.message}</p>}
      </div>
    </div>
  );
}
