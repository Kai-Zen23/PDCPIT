import { parentPort } from "worker_threads";

// Decoupled Background Worker Thread for low-latency AI heuristic calculations
parentPort?.on("message", (data: {
  matchId: string;
  botId: string;
  botTotal: number;
  oppVisibleTotal: number;
  target: number;
  powerUps: string[];
  handCount: number;
  oppHandCount: number;
}) => {
  const { botTotal, oppVisibleTotal, target, powerUps, handCount, oppHandCount } = data;
  let decision: { type: "DRAW" | "STAND" | "POWER_UP"; payload?: any } = { type: "DRAW" };

  // Rule A: Self-Preservation (Purge if actual points exceed current target)
  if (botTotal > target) {
    if (powerUps.includes("double_purge") && handCount >= 2) {
      decision = { type: "POWER_UP", payload: { type: "double_purge" } };
    } else if (powerUps.includes("self_cleanse") && handCount >= 1) {
      decision = { type: "POWER_UP", payload: { type: "self_cleanse" } };
    } else if (powerUps.includes("target_shift_28") && target < 28) {
      decision = { type: "POWER_UP", payload: { type: "target_shift_28" } };
    }
  }

  // Rule B: Offensive interception
  if (decision.type === "DRAW" && oppVisibleTotal >= 18) {
    if (powerUps.includes("card_destroyer") && oppHandCount > 0) {
      decision = { type: "POWER_UP", payload: { type: "card_destroyer", targetCardIndex: 0 } };
    } else if (powerUps.includes("rightmost_removal")) {
      decision = { type: "POWER_UP", payload: { type: "rightmost_removal" } };
    }
  }

  // Rule C: Advantageous win bounds
  if (decision.type === "DRAW" && botTotal <= 19 && powerUps.includes("target_shift_19") && target > 19) {
    decision = { type: "POWER_UP", payload: { type: "target_shift_19" } };
  }

  // Standard decisions
  if (decision.type === "DRAW") {
    if (botTotal >= 18 && botTotal <= target) {
      decision = { type: "STAND" };
    } else {
      decision = { type: "DRAW" };
    }
  }

  parentPort?.postMessage(decision);
});
