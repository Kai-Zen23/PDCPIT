import { nanoid } from "nanoid";
import type {
  Card,
  MatchEvent,
  MatchState,
  PowerUpType,
  RoundPlayerState,
  RoundState,
  TargetValue,
} from "./types.js";

const BASE_TARGET: TargetValue = 21;
const MAX_LIVES = 3;
const MAX_TURNS_PER_ROUND = 3;
const MAX_CARDS_PER_PLAYER = 4;

function shuffledDeck(): number[] {
  const deck = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function sumHand(hand: Card[]): number {
  return hand.reduce((acc, c) => acc + c.value, 0);
}

function createCard(value: number, visibility: Card["visibility"], ps: RoundPlayerState): Card {
  ps.drawIndex += 1;
  return {
    id: nanoid(10),
    value,
    visibility,
    drawnAtTurnIndex: ps.drawIndex,
  };
}

function dealInitialHands(
  deck: number[],
  p1: RoundPlayerState,
  p2: RoundPlayerState,
): { deck: number[]; p1: RoundPlayerState; p2: RoundPlayerState } {
  const d = [...deck];
  const p1v = d.shift()!;
  const p2v = d.shift()!;
  const p1h = d.shift()!;
  const p2h = d.shift()!;

  p1.hand = [
    createCard(p1v, "VISIBLE", p1),
    createCard(p1h, "HIDDEN_TO_OPPONENT", p1),
  ];
  p2.hand = [
    createCard(p2v, "VISIBLE", p2),
    createCard(p2h, "HIDDEN_TO_OPPONENT", p2),
  ];

  return { deck: d, p1, p2 };
}

function freshRoundPlayerState(): RoundPlayerState {
  return {
    stood: false,
    turnsTaken: 0,
    powerUpUsedThisRound: false,
    hand: [],
    drawIndex: 0,
    shielded: false,
  };
}

function bothPlayers(match: MatchState): [string, string] {
  if (match.playerOrder.length !== 2) {
    throw new Error("Match does not have 2 players yet.");
  }
  return [match.playerOrder[0], match.playerOrder[1]];
}

export function createMatch(matchId: string, playerId: string, playerName: string): MatchState {
  return {
    id: matchId,
    status: "WAITING",
    createdAt: Date.now(),
    players: {
      [playerId]: {
        id: playerId,
        name: playerName,
        lives: MAX_LIVES,
        powerUps: [],
      },
    },
    playerOrder: [playerId],
    round: null,
  };
}

export function addSecondPlayer(match: MatchState, playerId: string, playerName: string): void {
  if (match.playerOrder.length >= 2) throw new Error("Match already has 2 players.");
  match.players[playerId] = {
    id: playerId,
    name: playerName,
    lives: MAX_LIVES,
    powerUps: [],
  };
  match.playerOrder.push(playerId);
}

function grantPowerUpsForRound(match: MatchState, roundNumber: number): void {
  if (roundNumber !== 2 && roundNumber !== 3) return;

  const pool: PowerUpType[] = [
    "card_destroyer",
    "rightmost_removal",
    "self_cleanse",
    "double_purge",
    "target_shift_19",
    "target_shift_21",
    "target_shift_28",
    "shield",
    "random_swap",
    "sudden_risk",
    "lucky_replace",
  ];

  for (const pid of match.playerOrder) {
    const player = match.players[pid]!;
    // Filter out duplicates
    const available = pool.filter((p) => !player.powerUps.includes(p));
    // Pick 2 random unique ones
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    const chosen = shuffled.slice(0, 2);
    player.powerUps.push(...chosen);
  }
}

export function startMatch(match: MatchState): MatchEvent[] {
  const events: MatchEvent[] = [];
  match.status = "IN_PROGRESS";
  events.push({ type: "MATCH:STARTED", matchId: match.id });
  events.push(...startNextRound(match));
  return events;
}

export function startNextRound(match: MatchState): MatchEvent[] {
  const events: MatchEvent[] = [];
  const [p1id, p2id] = bothPlayers(match);
  const nextRoundNumber = (match.round?.roundNumber ?? 0) + 1;

  grantPowerUpsForRound(match, nextRoundNumber);

  // Starting rule: if starting total exceeds target, redraw.
  // Easiest: reshuffle and redeal until both players are <= target.
  let round: RoundState | null = null;
  for (let attempts = 0; attempts < 50; attempts++) {
    const p1 = freshRoundPlayerState();
    const p2 = freshRoundPlayerState();
    let deck = shuffledDeck();
    const dealt = dealInitialHands(deck, p1, p2);
    deck = dealt.deck;

    const p1Total = sumHand(dealt.p1.hand);
    const p2Total = sumHand(dealt.p2.hand);
    if (p1Total <= BASE_TARGET && p2Total <= BASE_TARGET) {
      round = {
        roundNumber: nextRoundNumber,
        target: BASE_TARGET,
        deck,
        activePlayerId: p1id, // p1 starts; can be randomized later
        players: {
          [p1id]: dealt.p1,
          [p2id]: dealt.p2,
        },
        ended: false,
        winnerPlayerId: null,
        revealAll: false,
      };
      break;
    }
  }
  if (!round) throw new Error("Failed to initialize round (too many attempts).");

  match.round = round;
  events.push({
    type: "ROUND:STARTED",
    matchId: match.id,
    roundNumber: round.roundNumber,
    target: round.target,
  });
  events.push({ type: "TURN:CHANGED", matchId: match.id, activePlayerId: round.activePlayerId });
  return events;
}

function ensureCanAct(round: RoundState, playerId: string): void {
  const ps = round.players[playerId];
  if (!ps) throw new Error("Player not in round.");
  if (round.ended) throw new Error("Round already ended.");
  if (round.activePlayerId !== playerId) throw new Error("Not your turn.");
  if (ps.stood) throw new Error("You already stood.");
  if (ps.turnsTaken >= MAX_TURNS_PER_ROUND) throw new Error("Turn limit reached.");
}

function maybeForceStand(round: RoundState, playerId: string, events: MatchEvent[], matchId: string): void {
  const ps = round.players[playerId]!;
  if (ps.turnsTaken >= MAX_TURNS_PER_ROUND && !ps.stood) {
    ps.stood = true;
    events.push({ type: "PLAYER:STOOD", matchId, playerId });
  }
}

function passTurn(round: RoundState, matchId: string, events: MatchEvent[]): void {
  const playerIds = Object.keys(round.players);
  const other = playerIds.find((id) => id !== round.activePlayerId)!;
  round.activePlayerId = other;
  events.push({ type: "TURN:CHANGED", matchId, activePlayerId: other });
}

function endRound(match: MatchState, winnerPlayerId: string | null, events: MatchEvent[]): void {
  const round = match.round!;
  round.ended = true;
  round.winnerPlayerId = winnerPlayerId;
  round.revealAll = true;

  events.push({ type: "ROUND:ENDED", matchId: match.id, winnerPlayerId, revealAll: true });

  if (winnerPlayerId) {
    const loserId = match.playerOrder.find((id) => id !== winnerPlayerId)!;
    match.players[loserId]!.lives -= 1;
    events.push({ type: "LIFE:LOST", matchId: match.id, playerId: loserId, lives: match.players[loserId]!.lives });
    if (match.players[loserId]!.lives <= 0) {
      match.status = "FINISHED";
      events.push({ type: "MATCH:ENDED", matchId: match.id, winnerPlayerId });
    }
  }
}

function evaluateAndMaybeEndRound(match: MatchState, events: MatchEvent[]): void {
  const round = match.round!;
  const [p1id, p2id] = bothPlayers(match);
  const p1 = round.players[p1id]!;
  const p2 = round.players[p2id]!;

  const p1Total = sumHand(p1.hand);
  const p2Total = sumHand(p2.hand);

  const p1Bust = p1Total > round.target;
  const p2Bust = p2Total > round.target;

  if (p1Bust && p2Bust) {
    // both bust -> tie
    endRound(match, null, events);
    return;
  }
  if (p1Bust) {
    endRound(match, p2id, events);
    return;
  }
  if (p2Bust) {
    endRound(match, p1id, events);
    return;
  }

  const deckEmpty = round.deck.length === 0;
  const p1TurnLimit = p1.turnsTaken >= MAX_TURNS_PER_ROUND;
  const p2TurnLimit = p2.turnsTaken >= MAX_TURNS_PER_ROUND;
  const bothStood = p1.stood && p2.stood;
  const bothTurnLimit = p1TurnLimit && p2TurnLimit;

  if (bothStood || deckEmpty || bothTurnLimit) {
    // closest to target wins; tie -> tie
    const p1Diff = Math.abs(round.target - p1Total);
    const p2Diff = Math.abs(round.target - p2Total);
    if (p1Diff < p2Diff) endRound(match, p1id, events);
    else if (p2Diff < p1Diff) endRound(match, p2id, events);
    else endRound(match, null, events);
  }
}

// ---- Commands

export function commandDraw(match: MatchState, playerId: string): MatchEvent[] {
  const round = match.round;
  if (!round) throw new Error("No active round.");
  ensureCanAct(round, playerId);
  const ps = round.players[playerId]!;
  if (ps.hand.length >= MAX_CARDS_PER_PLAYER) throw new Error("Card limit reached.");
  if (round.deck.length === 0) throw new Error("Deck is empty.");

  const events: MatchEvent[] = [];
  const value = round.deck.shift()!;
  const card = createCard(value, "VISIBLE", ps);
  ps.hand.push(card);
  ps.turnsTaken += 1;
  events.push({ type: "CARD:DRAWN", matchId: match.id, playerId, cardId: card.id });

  maybeForceStand(round, playerId, events, match.id);
  evaluateAndMaybeEndRound(match, events);
  if (!round.ended) passTurn(round, match.id, events);
  return events;
}

export function commandStand(match: MatchState, playerId: string): MatchEvent[] {
  const round = match.round;
  if (!round) throw new Error("No active round.");
  ensureCanAct(round, playerId);
  const ps = round.players[playerId]!;

  const events: MatchEvent[] = [];
  ps.stood = true;
  ps.turnsTaken += 1;
  events.push({ type: "PLAYER:STOOD", matchId: match.id, playerId });

  maybeForceStand(round, playerId, events, match.id);
  evaluateAndMaybeEndRound(match, events);
  if (!round.ended) passTurn(round, match.id, events);
  return events;
}

// Power-up semantics per your clarification:
// - All power-ups target ONLY the last drawn card in the round.
// - "Last drawn" includes the initial deal (visible/hidden) and any later draws; we use hand order.
// - Only 1 power-up per round per player.
export function commandPowerUp(
  match: MatchState,
  playerId: string,
  payload: any,
): MatchEvent[] {
  const round = match.round;
  if (!round) throw new Error("No active round.");
  ensureCanAct(round, playerId);

  const me = match.players[playerId];
  if (!me) throw new Error("Unknown player.");
  const ps = round.players[playerId]!;
  if (ps.powerUpUsedThisRound) throw new Error("You already used a power-up this round.");

  const powerUpType = payload.type as PowerUpType;
  const idx = me.powerUps.findIndex((p) => p === powerUpType);
  if (idx === -1) throw new Error("You don't have that power-up.");

  const [p1id, p2id] = bothPlayers(match);
  const opponentId = playerId === p1id ? p2id : p1id;
  const oppPs = round.players[opponentId]!;

  const events: MatchEvent[] = [];

  // Shield Check Logic
  const offensivePowerUps: PowerUpType[] = ["card_destroyer", "rightmost_removal", "random_swap"];
  if (offensivePowerUps.includes(powerUpType) && oppPs.shielded) {
    oppPs.shielded = false;
    // Consume power-up but do nothing else
    me.powerUps.splice(idx, 1);
    ps.powerUpUsedThisRound = true;
    ps.turnsTaken += 1;
    events.push({ type: "POWER_UP:USED", matchId: match.id, playerId, powerUp: powerUpType });
    // We could add a "SHIELD_BLOCKED" event if types allowed it, but for now just log it
    // console.log(`${oppPs.name}'s Shield blocked the power-up!`);
    
    maybeForceStand(round, playerId, events, match.id);
    evaluateAndMaybeEndRound(match, events);
    if (!round.ended) passTurn(round, match.id, events);
    return events;
  }

  switch (powerUpType) {
    case "card_destroyer": {
      if (oppPs.hand.length === 0) throw new Error("Opponent has no cards.");
      const targetIdx = payload.targetCardIndex ?? 0;
      const actualIdx = Math.max(0, Math.min(targetIdx, oppPs.hand.length - 1));
      oppPs.hand.splice(actualIdx, 1);
      break;
    }
    case "rightmost_removal": {
      if (oppPs.hand.length === 0) throw new Error("Opponent has no cards.");
      oppPs.hand.pop();
      break;
    }
    case "self_cleanse": {
      if (ps.hand.length === 0) throw new Error("You have no cards.");
      ps.hand.pop();
      break;
    }
    case "double_purge": {
      if (ps.hand.length < 2) throw new Error("You need at least 2 cards.");
      ps.hand.pop();
      ps.hand.pop();
      break;
    }
    case "target_shift_19": {
      round.target = 19;
      break;
    }
    case "target_shift_21": {
      round.target = 21;
      break;
    }
    case "target_shift_28": {
      round.target = 28;
      break;
    }
    case "shield": {
      ps.shielded = true;
      break;
    }
    case "random_swap": {
      if (ps.hand.length === 0 || oppPs.hand.length === 0)
        throw new Error("Both players must have at least 1 card.");
      const myIdx = Math.floor(Math.random() * ps.hand.length);
      const oppIdx = Math.floor(Math.random() * oppPs.hand.length);
      const myCard = ps.hand[myIdx];
      ps.hand[myIdx] = oppPs.hand[oppIdx];
      oppPs.hand[oppIdx] = myCard;
      break;
    }
    case "sudden_risk": {
      if (ps.hand.length === 0) throw new Error("You have no cards.");
      const lastCard = ps.hand[ps.hand.length - 1];
      lastCard.value *= 2;
      break;
    }
    case "lucky_replace": {
      if (ps.hand.length === 0) throw new Error("You have no cards.");
      if (round.deck.length === 0) throw new Error("Deck is empty.");
      const discardIdx = payload.discardIndex ?? 0;
      const actualDiscardIdx = Math.max(0, Math.min(discardIdx, ps.hand.length - 1));
      ps.hand.splice(actualDiscardIdx, 1);
      const value = round.deck.shift()!;
      const card = createCard(value, "VISIBLE", ps);
      ps.hand.push(card);
      events.push({ type: "CARD:DRAWN", matchId: match.id, playerId, cardId: card.id });
      break;
    }
  }

  ps.powerUpUsedThisRound = true;
  me.powerUps.splice(idx, 1);
  ps.turnsTaken += 1;
  events.push({ type: "POWER_UP:USED", matchId: match.id, playerId, powerUp: powerUpType });

  maybeForceStand(round, playerId, events, match.id);
  evaluateAndMaybeEndRound(match, events);
  if (!round.ended) passTurn(round, match.id, events);
  return events;
}

