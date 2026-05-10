import type { Card, CardView, MatchState, MatchViewForPlayer } from "./types.js";

function sumVisible(hand: Card[], revealAll: boolean, viewerIsOwner: boolean): number {
  return hand.reduce((acc, c) => {
    if (revealAll) return acc + c.value;
    if (viewerIsOwner) return acc + c.value;
    if (c.visibility === "VISIBLE") return acc + c.value;
    return acc;
  }, 0);
}

function toCardView(card: Card, revealAll: boolean, viewerIsOwner: boolean): CardView {
  if (revealAll || viewerIsOwner || card.visibility === "VISIBLE") {
    return { id: card.id, value: card.value, visibility: card.visibility };
  }
  return { id: card.id, hidden: true, visibility: card.visibility };
}

export function viewForPlayer(match: MatchState, playerId: string): MatchViewForPlayer {
  const you = match.players[playerId];
  if (!you) {
    throw new Error("Not a match player.");
  }
  const opponentId = match.playerOrder.find((id) => id !== playerId);
  const opp = opponentId ? match.players[opponentId] : undefined;

  const base: MatchViewForPlayer = {
    matchId: match.id,
    status: match.status,
    you: { playerId, name: you.name, lives: you.lives, powerUps: [...you.powerUps] },
    opponent: opp
      ? {
          playerId: opp.id,
          name: opp.name,
          lives: opp.lives,
          powerUpsCount: opp.powerUps.length,
        }
      : undefined,
  };

  if (!match.round) return base;

  const round = match.round;
  const yourRound = round.players[playerId];
  const oppRound = opponentId ? round.players[opponentId] : undefined;
  const revealAll = round.revealAll;

  return {
    ...base,
    round: {
      roundNumber: round.roundNumber,
      target: round.target,
      activePlayerId: round.activePlayerId,
      ended: round.ended,
      winnerPlayerId: round.winnerPlayerId,
      deckCount: round.deck.length,
      revealAll,
      you: {
        stood: yourRound.stood,
        turnsTaken: yourRound.turnsTaken,
        powerUpUsedThisRound: yourRound.powerUpUsedThisRound,
        hand: yourRound.hand.map((c) => toCardView(c, revealAll, true)),
        totalVisible: sumVisible(yourRound.hand, revealAll, true),
        totalActual: sumVisible(yourRound.hand, true, true),
        shielded: yourRound.shielded,
      },
      opponent: oppRound
        ? {
            stood: oppRound.stood,
            turnsTaken: oppRound.turnsTaken,
            powerUpUsedThisRound: oppRound.powerUpUsedThisRound,
            hand: oppRound.hand.map((c) => toCardView(c, revealAll, false)),
            totalVisible: sumVisible(oppRound.hand, revealAll, false),
            shielded: oppRound.shielded,
          }
        : undefined,
    },
  };
}

