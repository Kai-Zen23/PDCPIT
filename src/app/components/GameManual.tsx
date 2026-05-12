import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Target,
  Shield,
  Trash2,
  RefreshCw,
  Zap,
  TrendingUp,
  Award,
  Swords,
  Shuffle,
  Lightbulb
} from "lucide-react";

type Section =
  | "overview"
  | "core-rules"
  | "shared-deck"
  | "win-conditions"
  | "round-system"
  | "power-ups"
  | "target-shift"
  | "strategy";

interface PowerUp {
  id: string;
  icon: any;
  name: string;
  description: string;
  color: string;
}

const powerUps: PowerUp[] = [
  {
    id: "card-destroyer",
    icon: Trash2,
    name: "Card Destroyer",
    description: "Remove one card from your opponent's hand",
    color: "#D62828"
  },
  {
    id: "rightmost-removal",
    icon: Trash2,
    name: "Rightmost Removal",
    description: "Remove the rightmost card from opponent's hand",
    color: "#D62828"
  },
  {
    id: "self-cleanse",
    icon: RefreshCw,
    name: "Self Cleanse",
    description: "Remove one card from your own hand",
    color: "#4CC9F0"
  },
  {
    id: "double-purge",
    icon: Trash2,
    name: "Double Purge",
    description: "Remove two cards from your opponent's hand",
    color: "#D62828"
  },
  {
    id: "target-shift-19",
    icon: Target,
    name: "Target Shift 19",
    description: "Change the target value to 19 for this round",
    color: "#9D4EDD"
  },
  {
    id: "target-shift-21",
    icon: Target,
    name: "Target Shift 21",
    description: "Change the target value back to 21",
    color: "#2ECC71"
  },
  {
    id: "target-shift-28",
    icon: Target,
    name: "Target Shift 28",
    description: "Change the target value to 28 for this round",
    color: "#9D4EDD"
  },
  {
    id: "shield",
    icon: Shield,
    name: "Shield",
    description: "Block the next opponent power-up used against you",
    color: "#2ECC71"
  },
  {
    id: "random-swap",
    icon: Shuffle,
    name: "Random Swap",
    description: "Swap one random card with your opponent",
    color: "#4CC9F0"
  },
  {
    id: "sudden-risk",
    icon: Zap,
    name: "Sudden Risk",
    description: "Force opponent to draw a random card",
    color: "#D62828"
  },
  {
    id: "lucky-replace",
    icon: RefreshCw,
    name: "Lucky Replace",
    description: "Replace one of your cards with a new random draw",
    color: "#4CC9F0"
  }
];

export function GameManual() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<Section>("overview");

  const sections = [
    { id: "overview" as Section, name: "Overview", icon: Award },
    { id: "core-rules" as Section, name: "Core Rules", icon: Target },
    { id: "shared-deck" as Section, name: "Shared Deck System", icon: Shuffle },
    { id: "win-conditions" as Section, name: "Win Conditions", icon: TrendingUp },
    { id: "round-system" as Section, name: "Round System", icon: Swords },
    { id: "power-ups" as Section, name: "Power-Ups", icon: Zap },
    { id: "target-shift" as Section, name: "Target Shift Rules", icon: Target },
    { id: "strategy" as Section, name: "Strategy Tips", icon: Lightbulb }
  ];

  return (
    <div className="min-h-screen bg-[#121212] relative overflow-hidden" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[#9D4EDD] opacity-5 blur-[150px] rounded-full"></div>
      </div>

      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 z-20 px-4 py-2 bg-[#1E1E1E] border border-[#9D4EDD]/30 rounded-lg flex items-center gap-2 text-[#F5F5F5] hover:border-[#9D4EDD]/60 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Menu</span>
      </motion.button>

      {/* Main container */}
      <div className="relative z-10 min-h-screen pt-24 pb-12 px-8">
        <div className="max-w-7xl mx-auto flex gap-6">
          {/* LEFT NAVIGATION PANEL */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-64 flex-shrink-0"
          >
            <div
              className="bg-[#1E1E1E]/80 backdrop-blur-xl border-2 border-[#9D4EDD]/30 rounded-2xl p-4 sticky top-24"
              style={{ boxShadow: '0 0 40px rgba(157, 78, 221, 0.2)' }}
            >
              <h2
                className="text-xl text-[#F5F5F5] mb-4 pb-3 border-b border-[#9D4EDD]/30"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                GAME MANUAL
              </h2>
              <div className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <motion.button
                      key={section.id}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#9D4EDD] text-[#F5F5F5] shadow-[0_0_20px_rgba(157,78,221,0.6)]'
                          : 'bg-[#121212]/50 text-[#B0B0B0] hover:bg-[#9D4EDD]/20 hover:text-[#F5F5F5]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm">{section.name}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* CENTER CONTENT PANEL */}
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1E1E1E]/80 backdrop-blur-xl border-2 border-[#9D4EDD]/30 rounded-2xl p-8 min-h-[600px]"
              style={{ boxShadow: '0 0 40px rgba(157, 78, 221, 0.2)' }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {activeSection === "overview" && <OverviewSection />}
                  {activeSection === "core-rules" && <CoreRulesSection />}
                  {activeSection === "shared-deck" && <SharedDeckSection />}
                  {activeSection === "win-conditions" && <WinConditionsSection />}
                  {activeSection === "round-system" && <RoundSystemSection />}
                  {activeSection === "power-ups" && <PowerUpsSection powerUps={powerUps} />}
                  {activeSection === "target-shift" && <TargetShiftSection />}
                  {activeSection === "strategy" && <StrategySection />}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

// SECTION COMPONENTS

function OverviewSection() {
  return (
    <div>
      <h2
        className="text-4xl text-[#9D4EDD] mb-6"
        style={{
          fontFamily: 'Orbitron, sans-serif',
          textShadow: '0 0 20px rgba(157, 78, 221, 0.6)'
        }}
      >
        Overview
      </h2>
      <div className="space-y-4 text-[#F5F5F5]">
        <p className="text-lg leading-relaxed">
          <strong className="text-[#9D4EDD]">Card Clash 21</strong> is a turn-based multiplayer strategy card game where players compete to get closest to the target value without going over.
        </p>
        <div className="bg-[#121212]/50 border border-[#9D4EDD]/30 rounded-xl p-6 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-[#4CC9F0] rounded-full mt-2"></div>
            <p>Players draw cards from a <strong className="text-[#4CC9F0]">shared deck</strong> containing unique cards valued 1-11</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-[#4CC9F0] rounded-full mt-2"></div>
            <p><strong className="text-[#2ECC71]">Strategic power-ups</strong> allow you to manipulate cards and change the target value</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-[#4CC9F0] rounded-full mt-2"></div>
            <p>Each player starts with <strong className="text-[#D62828]">3 lives</strong> — first to lose all lives loses the match</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-[#4CC9F0] rounded-full mt-2"></div>
            <p>Victory requires both <strong className="text-[#9D4EDD]">tactical decision-making</strong> and calculated risk-taking</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CoreRulesSection() {
  return (
    <div>
      <h2
        className="text-4xl text-[#9D4EDD] mb-6"
        style={{
          fontFamily: 'Orbitron, sans-serif',
          textShadow: '0 0 20px rgba(157, 78, 221, 0.6)'
        }}
      >
        Core Rules
      </h2>
      <div className="space-y-6 text-[#F5F5F5]">
        <div className="bg-[#2ECC71]/10 border-2 border-[#2ECC71]/50 rounded-xl p-6">
          <p className="text-[#2ECC71] mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            KEY RULE: Going over the target does NOT automatically lose!
          </p>
          <p className="text-[#B0B0B0] text-sm">
            You may continue drawing cards even beyond 21. The closest value to the target wins.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-2xl text-[#4CC9F0]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            How to Win a Round
          </h3>
          <div className="space-y-3">
            <div className="bg-[#121212]/50 border border-[#9D4EDD]/30 rounded-lg p-4">
              <p className="text-[#4CC9F0] mb-2">✓ Closest value to target wins</p>
              <p className="text-sm text-[#B0B0B0]">Example: Target 21 → <strong className="text-[#2ECC71]">20</strong> vs 18 → 20 wins</p>
            </div>
            <div className="bg-[#121212]/50 border border-[#9D4EDD]/30 rounded-lg p-4">
              <p className="text-[#4CC9F0] mb-2">✓ If both exceed target, lower excess wins</p>
              <p className="text-sm text-[#B0B0B0]">Example: Target 21 → <strong className="text-[#2ECC71]">22</strong> vs 23 → 22 wins (only 1 over)</p>
            </div>
            <div className="bg-[#121212]/50 border border-[#9D4EDD]/30 rounded-lg p-4">
              <p className="text-[#4CC9F0] mb-2">✓ Exact match is ideal</p>
              <p className="text-sm text-[#B0B0B0]">Example: Target 21 → <strong className="text-[#2ECC71]">21</strong> vs 20 → 21 wins (perfect match)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SharedDeckSection() {
  const cards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const drawnCards = [3, 7, 11];

  return (
    <div>
      <h2
        className="text-4xl text-[#9D4EDD] mb-6"
        style={{
          fontFamily: 'Orbitron, sans-serif',
          textShadow: '0 0 20px rgba(157, 78, 221, 0.6)'
        }}
      >
        Shared Deck System
      </h2>
      <div className="space-y-6 text-[#F5F5F5]">
        <div className="bg-[#4CC9F0]/10 border-2 border-[#4CC9F0]/50 rounded-xl p-6">
          <p className="text-lg mb-4">
            <strong className="text-[#4CC9F0]">Only ONE shared deck exists</strong> between both players.
          </p>
          <div className="space-y-2 text-sm text-[#B0B0B0]">
            <p>• Cards 1-11 are unique during each round</p>
            <p>• If Player 1 draws a "5", Player 2 cannot draw "5" that round</p>
            <p>• Track which cards have been drawn for strategic advantage</p>
          </div>
        </div>

        <div>
          <h3 className="text-xl text-[#F5F5F5] mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Example Deck State
          </h3>
          <div className="flex gap-2 flex-wrap">
            {cards.map((card) => {
              const isDrawn = drawnCards.includes(card);
              return (
                <div
                  key={card}
                  className={`w-16 h-24 rounded-lg flex items-center justify-center text-2xl transition-all ${
                    isDrawn
                      ? 'bg-[#1E1E1E] border-2 border-[#D62828]/50 text-[#D62828] opacity-40 line-through'
                      : 'bg-gradient-to-br from-[#1E1E1E] to-[#2A2A2A] border-2 border-[#4CC9F0] text-[#4CC9F0]'
                  }`}
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    boxShadow: isDrawn ? 'none' : '0 0 15px rgba(76, 201, 240, 0.4)'
                  }}
                >
                  {card}
                </div>
              );
            })}
          </div>
          <p className="text-sm text-[#B0B0B0] mt-4">
            <span className="text-[#D62828]">Red crossed cards</span> have already been drawn this round
          </p>
        </div>

        <div className="bg-[#2ECC71]/10 border-2 border-[#2ECC71]/50 rounded-xl p-6">
          <p className="text-[#2ECC71] mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            IMPORTANT: Deck resets every round!
          </p>
          <p className="text-[#B0B0B0] text-sm">
            All cards become available again at the start of each new round. Remaining cards do NOT carry over.
          </p>
        </div>
      </div>
    </div>
  );
}

function WinConditionsSection() {
  return (
    <div>
      <h2
        className="text-4xl text-[#9D4EDD] mb-6"
        style={{
          fontFamily: 'Orbitron, sans-serif',
          textShadow: '0 0 20px rgba(157, 78, 221, 0.6)'
        }}
      >
        Win Conditions
      </h2>
      <div className="space-y-6 text-[#F5F5F5]">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#2ECC71]/10 border-2 border-[#2ECC71]/50 rounded-xl p-6">
            <h3 className="text-xl text-[#2ECC71] mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Win a Round
            </h3>
            <div className="space-y-2 text-sm text-[#B0B0B0]">
              <p>✓ Closest to target value</p>
              <p>✓ Opponent's total exceeds yours</p>
              <p>✓ Opponent forfeits their turn</p>
            </div>
          </div>

          <div className="bg-[#D62828]/10 border-2 border-[#D62828]/50 rounded-xl p-6">
            <h3 className="text-xl text-[#D62828] mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Lose a Round
            </h3>
            <div className="space-y-2 text-sm text-[#B0B0B0]">
              <p>✗ Farther from target than opponent</p>
              <p>✗ Both exceed: higher total loses</p>
              <p>✗ Time runs out on your turn</p>
            </div>
          </div>
        </div>

        <div className="bg-[#9D4EDD]/10 border-2 border-[#9D4EDD]/50 rounded-xl p-6">
          <h3 className="text-2xl text-[#9D4EDD] mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Win the Match
          </h3>
          <p className="text-lg mb-4">
            First player to eliminate all opponent's lives (3 → 0) wins the entire match!
          </p>
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 bg-[#2ECC71] rounded-full"
                  style={{ boxShadow: '0 0 10px #2ECC71' }}
                />
              ))}
            </div>
            <span className="text-[#B0B0B0]">→</span>
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 bg-[#B0B0B0]/20 rounded-full border border-[#B0B0B0]/30"
                />
              ))}
            </div>
            <span className="text-[#2ECC71]">= VICTORY</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoundSystemSection() {
  return (
    <div>
      <h2
        className="text-4xl text-[#9D4EDD] mb-6"
        style={{
          fontFamily: 'Orbitron, sans-serif',
          textShadow: '0 0 20px rgba(157, 78, 221, 0.6)'
        }}
      >
        Round System
      </h2>
      <div className="space-y-6 text-[#F5F5F5]">
        <div className="bg-[#121212]/50 border border-[#9D4EDD]/30 rounded-xl p-6">
          <h3 className="text-xl text-[#4CC9F0] mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Lives System
          </h3>
          <p className="text-[#B0B0B0] mb-4">
            Each player starts with <strong className="text-[#F5F5F5]">3 lives</strong>. Losing a round removes 1 life.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-4 h-4 bg-[#D62828] rounded-full"
                  style={{ boxShadow: '0 0 10px #D62828' }}
                />
              ))}
            </div>
            <span className="text-sm text-[#B0B0B0]">Full Health</span>
          </div>
        </div>

        <div>
          <h3 className="text-2xl text-[#4CC9F0] mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Power-Up Distribution
          </h3>
          <div className="space-y-3">
            <div className="bg-[#121212]/50 border border-[#9D4EDD]/30 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-[#F5F5F5] mb-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  ROUND 1
                </p>
                <p className="text-sm text-[#B0B0B0]">No power-ups — pure strategy</p>
              </div>
              <div className="text-[#B0B0B0] text-3xl" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                0
              </div>
            </div>

            <div className="bg-[#9D4EDD]/10 border-2 border-[#9D4EDD]/50 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-[#9D4EDD] mb-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  ROUND 2
                </p>
                <p className="text-sm text-[#B0B0B0]">Receive 2 random power-ups</p>
              </div>
              <div className="text-[#9D4EDD] text-3xl" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                +2
              </div>
            </div>

            <div className="bg-[#4CC9F0]/10 border-2 border-[#4CC9F0]/50 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-[#4CC9F0] mb-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  ROUND 3
                </p>
                <p className="text-sm text-[#B0B0B0]">Receive 2 additional power-ups (4 total)</p>
              </div>
              <div className="text-[#4CC9F0] text-3xl" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                +2
              </div>
            </div>
          </div>

          <div className="mt-4 bg-[#2ECC71]/10 border border-[#2ECC71]/50 rounded-lg p-4">
            <p className="text-sm text-[#B0B0B0]">
              <strong className="text-[#2ECC71]">Note:</strong> No duplicate power-ups allowed per player
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PowerUpsSection({ powerUps }: { powerUps: PowerUp[] }) {
  return (
    <div>
      <h2
        className="text-4xl text-[#9D4EDD] mb-6"
        style={{
          fontFamily: 'Orbitron, sans-serif',
          textShadow: '0 0 20px rgba(157, 78, 221, 0.6)'
        }}
      >
        Power-Ups
      </h2>
      <div className="space-y-6">
        <p className="text-[#F5F5F5]">
          Power-ups provide tactical advantages. Use them wisely to turn the tide of battle.
        </p>

        <div className="grid grid-cols-2 gap-4">
          {powerUps.map((powerup) => {
            const Icon = powerup.icon;
            return (
              <motion.div
                key={powerup.id}
                whileHover={{ scale: 1.02, y: -4 }}
                className="bg-[#121212]/50 border-2 rounded-xl p-4 transition-all cursor-pointer"
                style={{
                  borderColor: `${powerup.color}40`,
                  boxShadow: `0 0 20px ${powerup.color}20`
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: `${powerup.color}20`,
                      border: `2px solid ${powerup.color}60`,
                      boxShadow: `0 0 15px ${powerup.color}40`
                    }}
                  >
                    <Icon className="w-6 h-6" style={{ color: powerup.color }} />
                  </div>
                  <div className="flex-1">
                    <h3
                      className="text-[#F5F5F5] mb-1"
                      style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.9rem' }}
                    >
                      {powerup.name}
                    </h3>
                    <p className="text-[#B0B0B0] text-sm leading-relaxed">
                      {powerup.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TargetShiftSection() {
  const targets = [
    { value: 19, color: "#9D4EDD", description: "Lower target - favors conservative play" },
    { value: 21, color: "#2ECC71", description: "Default target - balanced gameplay" },
    { value: 28, color: "#9D4EDD", description: "Higher target - favors aggressive play" }
  ];

  return (
    <div>
      <h2
        className="text-4xl text-[#9D4EDD] mb-6"
        style={{
          fontFamily: 'Orbitron, sans-serif',
          textShadow: '0 0 20px rgba(157, 78, 221, 0.6)'
        }}
      >
        Target Shift Rules
      </h2>
      <div className="space-y-6 text-[#F5F5F5]">
        <p className="text-lg">
          Some power-ups can <strong className="text-[#4CC9F0]">change the target value</strong> for the current round, dramatically shifting strategy.
        </p>

        <div className="space-y-4">
          {targets.map((target) => (
            <div
              key={target.value}
              className="bg-[#121212]/50 border-2 rounded-xl p-6 flex items-center gap-6"
              style={{
                borderColor: `${target.color}40`,
                boxShadow: `0 0 30px ${target.color}20`
              }}
            >
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl flex-shrink-0"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  backgroundColor: `${target.color}20`,
                  border: `3px solid ${target.color}60`,
                  color: target.color,
                  boxShadow: `0 0 40px ${target.color}60, inset 0 0 20px ${target.color}30`
                }}
              >
                {target.value}
              </div>
              <div>
                <h3 className="text-xl text-[#F5F5F5] mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  Target: {target.value}
                </h3>
                <p className="text-[#B0B0B0]">{target.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#4CC9F0]/10 border-2 border-[#4CC9F0]/50 rounded-xl p-6">
          <p className="text-[#4CC9F0] mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Strategic Impact
          </p>
          <div className="text-sm text-[#B0B0B0] space-y-2">
            <p>• Target shifts last for the entire round</p>
            <p>• High totals become advantageous when target shifts to 28</p>
            <p>• Low totals gain value when target shifts to 19</p>
            <p>• Current target is always displayed prominently during gameplay</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StrategySection() {
  const tips = [
    {
      title: "Track the Deck",
      description: "Remember which cards have been drawn. If 7 is already out, you know it won't appear again this round.",
      icon: Target,
      color: "#9D4EDD"
    },
    {
      title: "Save Your Shield",
      description: "Don't waste Shield early. Save it to block critical opponent power-ups like Card Destroyer or Double Purge.",
      icon: Shield,
      color: "#2ECC71"
    },
    {
      title: "Bluff with High Totals",
      description: "Sometimes drawing beyond 21 can pressure your opponent into making mistakes. A 24 beats a 25.",
      icon: Zap,
      color: "#4CC9F0"
    },
    {
      title: "Target Shift Timing",
      description: "Use Target Shift power-ups when you have a favorable hand. Shift to 28 if you're already at 25+.",
      icon: Target,
      color: "#9D4EDD"
    },
    {
      title: "Removal Strategy",
      description: "Use removal cards (Card Destroyer, Double Purge) when opponent is close to target to force them over.",
      icon: Trash2,
      color: "#D62828"
    },
    {
      title: "Calculate Probabilities",
      description: "With cards 1-11, your average draw is 6. Plan your draws based on remaining cards in the deck.",
      icon: TrendingUp,
      color: "#4CC9F0"
    }
  ];

  return (
    <div>
      <h2
        className="text-4xl text-[#9D4EDD] mb-6"
        style={{
          fontFamily: 'Orbitron, sans-serif',
          textShadow: '0 0 20px rgba(157, 78, 221, 0.6)'
        }}
      >
        Strategy Tips
      </h2>
      <div className="space-y-4">
        <p className="text-[#F5F5F5] text-lg mb-6">
          Master these tactical concepts to dominate the competition.
        </p>

        {tips.map((tip, index) => {
          const Icon = tip.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-[#121212]/50 border-2 rounded-xl p-5 flex items-start gap-4"
              style={{
                borderColor: `${tip.color}40`,
                boxShadow: `0 0 20px ${tip.color}20`
              }}
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: `${tip.color}20`,
                  border: `2px solid ${tip.color}60`,
                  boxShadow: `0 0 15px ${tip.color}40`
                }}
              >
                <Icon className="w-6 h-6" style={{ color: tip.color }} />
              </div>
              <div>
                <h3
                  className="text-[#F5F5F5] text-lg mb-2"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  {tip.title}
                </h3>
                <p className="text-[#B0B0B0] text-sm leading-relaxed">
                  {tip.description}
                </p>
              </div>
            </motion.div>
          );
        })}

        <div className="mt-8 bg-[#9D4EDD]/10 border-2 border-[#9D4EDD]/50 rounded-xl p-6 text-center">
          <p
            className="text-2xl text-[#9D4EDD] mb-2"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Ready to Master Card Clash 21?
          </p>
          <p className="text-[#B0B0B0]">
            Practice these strategies and adapt to your opponent's playstyle. Victory awaits!
          </p>
        </div>
      </div>
    </div>
  );
}
