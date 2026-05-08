import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Copy, Users, ArrowLeft } from "lucide-react";

export function Lobby() {
  const navigate = useNavigate();
  const [roomCode] = useState("AX7K9P");
  const [players] = useState([
    { id: 1, name: "Player1", ready: true },
    { id: 2, name: "Waiting...", ready: false },
  ]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
  };

  return (
    <div className="min-h-screen bg-[#121212] relative overflow-hidden" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Background glow */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#9D4EDD] opacity-10 blur-[150px] rounded-full"></div>
      </div>

      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 z-20 px-4 py-2 bg-[#1E1E1E] border border-[#9D4EDD]/30 rounded-lg flex items-center gap-2 text-[#F5F5F5] hover:border-[#9D4EDD]/60 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </motion.button>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl"
        >
          {/* Glass panel */}
          <div
            className="bg-[#1E1E1E]/80 backdrop-blur-xl border-2 border-[#9D4EDD]/40 rounded-2xl p-8"
            style={{ boxShadow: '0 0 60px rgba(157, 78, 221, 0.4)' }}
          >
            {/* Title */}
            <div className="text-center mb-8">
              <h2
                className="text-4xl text-[#F5F5F5] mb-2"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                GAME LOBBY
              </h2>
              <p className="text-[#B0B0B0]">Share the room code with your opponent</p>
            </div>

            {/* Room code */}
            <div className="mb-8">
              <label className="block text-[#B0B0B0] mb-3 text-sm uppercase tracking-wide">
                Room Code
              </label>
              <div className="flex gap-3">
                <div
                  className="flex-1 bg-[#121212] border-2 border-[#9D4EDD]/60 rounded-xl px-6 py-4 text-center"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    boxShadow: '0 0 30px rgba(157, 78, 221, 0.3)'
                  }}
                >
                  <span className="text-3xl text-[#9D4EDD] tracking-[0.3em]">{roomCode}</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={copyRoomCode}
                  className="px-6 bg-[#4CC9F0] hover:bg-[#3AB5DC] rounded-xl flex items-center justify-center transition-colors"
                  style={{ boxShadow: '0 0 20px rgba(76, 201, 240, 0.4)' }}
                >
                  <Copy className="w-6 h-6 text-[#121212]" />
                </motion.button>
              </div>
            </div>

            {/* Players */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-[#9D4EDD]" />
                <label className="text-[#B0B0B0] text-sm uppercase tracking-wide">
                  Players ({players.filter(p => p.ready).length}/2)
                </label>
              </div>
              <div className="space-y-3">
                {players.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-[#121212] border-2 ${
                      player.ready ? 'border-[#2ECC71]/60' : 'border-[#9D4EDD]/30'
                    } rounded-xl px-6 py-4 flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          player.ready ? 'bg-[#2ECC71]' : 'bg-[#B0B0B0]'
                        }`}
                        style={{
                          boxShadow: player.ready ? '0 0 10px #2ECC71' : 'none'
                        }}
                      ></div>
                      <span className="text-[#F5F5F5]">{player.name}</span>
                    </div>
                    {player.ready && (
                      <span className="text-[#2ECC71] text-sm uppercase tracking-wide">
                        Ready
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/waiting')}
                className="flex-1 px-8 py-4 bg-gradient-to-r from-[#2ECC71] to-[#27AE60] rounded-xl text-[#F5F5F5] text-lg tracking-wide"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  boxShadow: '0 0 30px rgba(46, 204, 113, 0.5)'
                }}
              >
                READY
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/')}
                className="px-8 py-4 bg-[#1E1E1E] border-2 border-[#D62828]/60 rounded-xl text-[#D62828] text-lg tracking-wide"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                LEAVE
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
