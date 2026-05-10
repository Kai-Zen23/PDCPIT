import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import { RefreshCw, Zap } from 'lucide-react';

export function Draw() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 font-orbitron overflow-hidden relative">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#9D4EDD] to-transparent opacity-50" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#4CC9F0] to-transparent opacity-50" />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="relative mb-8">
          <motion.div
            animate={{ 
              rotate: [0, 180, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="w-48 h-48 border-4 border-dashed border-[#B0B0B0]/20 rounded-full flex items-center justify-center"
          >
            <div className="w-40 h-40 border-2 border-[#B0B0B0]/10 rounded-full flex items-center justify-center">
              <Zap className="w-20 h-20 text-[#B0B0B0] opacity-50" />
            </div>
          </motion.div>
          
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-[#B0B0B0]/5 blur-3xl rounded-full"
          />
        </div>

        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#F5F5F5] to-[#404040] mb-4 tracking-tighter">
          DRAW
        </h1>
        
        <p className="text-[#B0B0B0] text-sm md:text-base uppercase tracking-[0.4em] mb-12 opacity-70">
          NEURAL EQUILIBRIUM REACHED
        </p>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(157,78,221,0.4)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="w-full py-4 bg-white/5 border border-white/10 rounded-xl text-[#F5F5F5] font-orbitron text-sm tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            RETURN TO MENU
          </motion.button>
        </div>
      </motion.div>

      {/* Decorative side text */}
      <div className="absolute left-10 top-1/2 -rotate-90 origin-left hidden md:block">
        <p className="text-[#B0B0B0]/10 text-xs tracking-[1em] uppercase">Status: Equalized // System: Balanced</p>
      </div>
      <div className="absolute right-10 top-1/2 rotate-90 origin-right hidden md:block">
        <p className="text-[#B0B0B0]/10 text-xs tracking-[1em] uppercase">Network Latency: Optimal // Round: 3</p>
      </div>
    </div>
  );
}
