import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Heart, Plus, Minus, Target, Zap, Trash2, RefreshCw } from "lucide-react";

interface Card {
  id: number;
  value: number;
  visible: boolean;
}

interface Player {
  name: string;
  lives: number;
  cards: Card[];
}

export function Gameplay() {
  const navigate = useNavigate();
  const [currentTurn, setCurrentTurn] = useState<"player" | "opponent">("player");
  const [actionLog, setActionLog] = useState<string[]>([
    "Game started",
    "Player1's turn",
  ]);

  const [player, setPlayer] = useState<Player>({
    name: "Player1",
    lives: 3,
    cards: [
      { id: 1, value: 5, visible: true },
      { id: 2, value: 7, visible: true },
    ],
  });

  const [opponent, setOpponent] = useState<Player>({
    name: "Opponent",
    lives: 3,
    cards: [
      { id: 1, value: 8, visible: true },
      { id: 2, value: 4, visible: false },
      { id: 3, value: 6, visible: false },
    ],
  });

  const playerTotal = player.cards.reduce((sum, card) => sum + card.value, 0);
  const opponentVisibleTotal = opponent.cards
    .filter(c => c.visible)
    .reduce((sum, card) => sum + card.value, 0);

  const drawCard = () => {
    const newCard = {
      id: player.cards.length + 1,
      value: Math.floor(Math.random() * 10) + 1,
      visible: true,
    };
    setPlayer({ ...player, cards: [...player.cards, newCard] });
    setActionLog([`Player1 drew a ${newCard.value}`, ...actionLog]);

    if (playerTotal + newCard.value > 21) {
      setTimeout(() => navigate('/defeat'), 1500);
    }
  };

  const stand = () => {
    setActionLog(["Player1 stands", ...actionLog]);
    setCurrentTurn("opponent");
    setTimeout(() => {
      if (Math.random() > 0.5) {
        navigate('/victory');
      } else {
        navigate('/defeat');
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#121212] relative overflow-hidden" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[#9D4EDD] opacity-5 blur-[150px] rounded-full"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* TOP SECTION - Opponent */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6"
        >
          <div
            className={`bg-[#1E1E1E]/80 backdrop-blur-sm border-2 rounded-2xl p-6 transition-all ${
              currentTurn === "opponent"
                ? 'border-[#9D4EDD] shadow-[0_0_40px_rgba(157,78,221,0.6)]'
                : 'border-[#9D4EDD]/30'
            }`}
          >
            {/* Opponent info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-2xl text-[#F5F5F5]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  {opponent.name}
                </h3>
                <div className="flex gap-2">
                  {[...Array(3)].map((_, i) => (
                    <Heart
                      key={i}
                      className={`w-6 h-6 ${
                        i < opponent.lives ? 'text-[#D62828] fill-[#D62828]' : 'text-[#B0B0B0]/30'
                      }`}
                      style={i < opponent.lives ? { filter: 'drop-shadow(0 0 8px #D62828)' } : {}}
                    />
                  ))}
                </div>
              </div>
              <div className="text-[#B0B0B0]">
                Cards: {opponent.cards.length}
              </div>
            </div>

            {/* Opponent cards */}
            <div className="flex gap-3 justify-center">
              {opponent.cards.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`w-20 h-28 rounded-xl flex items-center justify-center ${
                    card.visible
                      ? 'bg-gradient-to-br from-[#1E1E1E] to-[#2A2A2A] border-2 border-[#9D4EDD]'
                      : 'bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] border-2 border-[#B0B0B0]/30'
                  }`}
                  style={{
                    boxShadow: card.visible ? '0 0 20px rgba(157, 78, 221, 0.5)' : 'none'
                  }}
                >
                  {card.visible ? (
                    <span
                      className="text-4xl text-[#9D4EDD]"
                      style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                      {card.value}
                    </span>
                  ) : (
                    <span className="text-4xl text-[#B0B0B0]">?</span>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Opponent total */}
            <div className="text-center mt-4">
              <span className="text-[#B0B0B0] text-sm">Visible Total: </span>
              <span className="text-[#9D4EDD] text-xl" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                {opponentVisibleTotal}
              </span>
            </div>
          </div>
        </motion.div>

        {/* CENTER SECTION - Battlefield */}
        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="grid grid-cols-2 gap-8 w-full max-w-4xl">
            {/* Target number */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center"
            >
              <Target className="w-12 h-12 text-[#9D4EDD] mb-4" />
              <div className="text-center">
                <p className="text-[#B0B0B0] text-sm uppercase tracking-wide mb-2">Target</p>
                <div
                  className="text-8xl text-[#9D4EDD]"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    textShadow: '0 0 60px rgba(157, 78, 221, 1), 0 0 100px rgba(157, 78, 221, 0.6)'
                  }}
                >
                  21
                </div>
              </div>
            </motion.div>

            {/* Action log */}
            <div className="bg-[#1E1E1E]/60 backdrop-blur-sm border border-[#9D4EDD]/30 rounded-xl p-4">
              <h4 className="text-[#9D4EDD] mb-3 text-sm uppercase tracking-wide flex items-center gap-2">
                <div className="w-2 h-2 bg-[#9D4EDD] rounded-full animate-pulse"></div>
                Action Log
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                <AnimatePresence>
                  {actionLog.slice(0, 6).map((action, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="text-[#B0B0B0] text-sm"
                    >
                      <span className="text-[#4CC9F0]">›</span> {action}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION - Player */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6"
        >
          <div
            className={`bg-[#1E1E1E]/80 backdrop-blur-sm border-2 rounded-2xl p-6 transition-all ${
              currentTurn === "player"
                ? 'border-[#4CC9F0] shadow-[0_0_40px_rgba(76,201,240,0.6)]'
                : 'border-[#4CC9F0]/30'
            }`}
          >
            {/* Player info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-2xl text-[#F5F5F5]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  {player.name}
                </h3>
                <div className="flex gap-2">
                  {[...Array(3)].map((_, i) => (
                    <Heart
                      key={i}
                      className={`w-6 h-6 ${
                        i < player.lives ? 'text-[#2ECC71] fill-[#2ECC71]' : 'text-[#B0B0B0]/30'
                      }`}
                      style={i < player.lives ? { filter: 'drop-shadow(0 0 8px #2ECC71)' } : {}}
                    />
                  ))}
                </div>
              </div>
              <div className="text-[#4CC9F0] text-3xl" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Total: {playerTotal}
              </div>
            </div>

            {/* Player cards */}
            <div className="flex gap-3 justify-center mb-6">
              {player.cards.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, scale: 0.8, y: 50 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="w-24 h-36 bg-gradient-to-br from-[#1E1E1E] to-[#2A2A2A] border-2 border-[#4CC9F0] rounded-xl flex items-center justify-center"
                  style={{
                    boxShadow: '0 0 25px rgba(76, 201, 240, 0.6)'
                  }}
                >
                  <span
                    className="text-5xl text-[#4CC9F0]"
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                  >
                    {card.value}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={drawCard}
                disabled={currentTurn !== "player"}
                className="px-6 py-4 bg-gradient-to-r from-[#9D4EDD] to-[#8B3DC7] rounded-xl text-[#F5F5F5] text-lg tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  boxShadow: currentTurn === "player" ? '0 0 30px rgba(157, 78, 221, 0.6)' : 'none'
                }}
              >
                <Plus className="w-5 h-5" />
                DRAW
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={stand}
                disabled={currentTurn !== "player"}
                className="px-6 py-4 bg-[#1E1E1E] border-2 border-[#B0B0B0]/50 rounded-xl text-[#F5F5F5] text-lg tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:border-[#B0B0B0]"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                <Minus className="w-5 h-5" />
                STAND
              </motion.button>
            </div>

            {/* Power-ups */}
            <div className="border-t border-[#9D4EDD]/30 pt-4">
              <h4 className="text-[#4CC9F0] text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Power-Ups
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: Trash2, label: "Remove Card" },
                  { icon: RefreshCw, label: "Swap Card" },
                  { icon: Target, label: "Override" },
                  { icon: Zap, label: "Double" },
                ].map((powerup, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-[#121212] border border-[#4CC9F0]/40 rounded-lg p-3 flex flex-col items-center gap-2 hover:border-[#4CC9F0] hover:bg-[#4CC9F0]/10 transition-all"
                    style={{ boxShadow: '0 0 15px rgba(76, 201, 240, 0.2)' }}
                  >
                    <powerup.icon className="w-6 h-6 text-[#4CC9F0]" />
                    <span className="text-[#B0B0B0] text-xs">{powerup.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(157, 78, 221, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #9D4EDD;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
