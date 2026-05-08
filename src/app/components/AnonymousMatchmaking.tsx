import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Users, Wifi } from "lucide-react";

export function AnonymousMatchmaking() {
  const navigate = useNavigate();
  const [playersInQueue] = useState(Math.floor(Math.random() * 50) + 10);
  const [matchStatus, setMatchStatus] = useState<"searching" | "found" | "connecting">("searching");

  useEffect(() => {
    // Simulate matchmaking progression
    const searchTimer = setTimeout(() => {
      setMatchStatus("found");
    }, 2000);

    const foundTimer = setTimeout(() => {
      setMatchStatus("connecting");
    }, 3500);

    const connectTimer = setTimeout(() => {
      navigate('/match-found');
    }, 5000);

    return () => {
      clearTimeout(searchTimer);
      clearTimeout(foundTimer);
      clearTimeout(connectTimer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#121212] relative overflow-hidden" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Animated background with scanning effect */}
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

        {/* Scanning grid lines */}
        <motion.div
          className="absolute inset-0 opacity-30"
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
      </div>

      {/* Floating cards in background */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-16 h-24 bg-gradient-to-br from-[#1E1E1E] to-[#2A2A2A] rounded-lg border border-[#9D4EDD]/20 opacity-40"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -40, 0],
            rotate: [0, 10, -10, 0],
            opacity: [0.2, 0.5, 0.2],
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

        {/* Center text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1
            className="text-5xl text-[#F5F5F5] mb-4"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              textShadow: '0 0 30px rgba(157, 78, 221, 0.8)',
            }}
          >
            {matchStatus === "searching" && "FINDING OPPONENT..."}
            {matchStatus === "found" && "OPPONENT FOUND"}
            {matchStatus === "connecting" && "CONNECTING TO SERVER..."}
          </h1>

          <motion.p
            className="text-[#B0B0B0] text-lg"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            You are joining a live match
          </motion.p>

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
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-[#1E1E1E]/80 backdrop-blur-xl border-2 border-[#9D4EDD]/40 rounded-2xl p-8 mb-12 min-w-[400px]"
          style={{ boxShadow: '0 0 60px rgba(157, 78, 221, 0.3)' }}
        >
          <div className="space-y-6">
            {/* Players in queue */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-[#4CC9F0]" />
                <span className="text-[#B0B0B0]">Players in Queue</span>
              </div>
              <span
                className="text-2xl text-[#4CC9F0]"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {playersInQueue}
              </span>
            </div>

            {/* Match status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wifi className="w-6 h-6 text-[#9D4EDD]" />
                <span className="text-[#B0B0B0]">Match Status</span>
              </div>
              <div className="flex items-center gap-2">
                <motion.div
                  className={`w-3 h-3 rounded-full ${
                    matchStatus === "searching" ? 'bg-[#4CC9F0]' :
                    matchStatus === "found" ? 'bg-[#2ECC71]' :
                    'bg-[#9D4EDD]'
                  }`}
                  animate={{
                    boxShadow: [
                      `0 0 10px ${matchStatus === "searching" ? '#4CC9F0' : matchStatus === "found" ? '#2ECC71' : '#9D4EDD'}`,
                      `0 0 20px ${matchStatus === "searching" ? '#4CC9F0' : matchStatus === "found" ? '#2ECC71' : '#9D4EDD'}`,
                      `0 0 10px ${matchStatus === "searching" ? '#4CC9F0' : matchStatus === "found" ? '#2ECC71' : '#9D4EDD'}`,
                    ],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span
                  className={`text-xl ${
                    matchStatus === "searching" ? 'text-[#4CC9F0]' :
                    matchStatus === "found" ? 'text-[#2ECC71]' :
                    'text-[#9D4EDD]'
                  }`}
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  {matchStatus === "searching" && "1/2"}
                  {matchStatus === "found" && "2/2"}
                  {matchStatus === "connecting" && "READY"}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Cancel button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/')}
          className="px-8 py-3 bg-[#1E1E1E] border-2 border-[#D62828]/60 rounded-xl text-[#D62828] tracking-wide hover:border-[#D62828] hover:bg-[#D62828]/10 transition-all"
          style={{
            fontFamily: 'Orbitron, sans-serif',
            boxShadow: '0 0 20px rgba(214, 40, 40, 0.3)',
          }}
        >
          CANCEL MATCH
        </motion.button>
      </div>
    </div>
  );
}
