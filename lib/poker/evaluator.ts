// Hand evaluation wrapper using pokersolver

import { Card } from './types';
import { cardToString } from './deck';

// Import pokersolver - it's synchronous
// @ts-ignore - pokersolver doesn't have types
const pokersolver = require('pokersolver');
const Hand = pokersolver.Hand;

export interface HandResult {
  rank: number; // Lower is better (1 = royal flush, 10 = high card)
  name: string; // e.g., "Two Pair, A's & K's"
  descr: string; // Full description
  cards: Card[]; // The 5 cards that make the hand
}

// Evaluate a hand (5-7 cards) - synchronous
export function evaluateHand(cards: Card[]): HandResult {
  // Convert to pokersolver format (e.g., "Ah", "Kd")
  const cardStrings = cards.map(c => cardToString(c));

  const hand = Hand.solve(cardStrings);

  return {
    rank: hand.rank,
    name: hand.name,
    descr: hand.descr,
    cards: hand.cards.map((c: any) => ({
      rank: c.value === 'T' ? 'T' : c.value,
      suit: c.suit
    }))
  };
}

// Compare hands and return winners (handles ties) - synchronous
export function findWinners(
  playerHands: { playerId: string; cards: Card[] }[],
  communityCards: Card[]
): { playerId: string; hand: HandResult }[] {
  const evaluatedHands = playerHands.map(({ playerId, cards }) => {
    const allCards = [...cards, ...communityCards];
    const cardStrings = allCards.map(c => cardToString(c));
    const solverHand = Hand.solve(cardStrings);
    const hand = evaluateHand(allCards);
    return { playerId, hand, solverHand };
  });

  // Use pokersolver's winners function
  const solverHands = evaluatedHands.map(h => h.solverHand);
  const winnerHands = Hand.winners(solverHands);

  // Find which players have winning hands
  const winners = evaluatedHands.filter(h =>
    winnerHands.some((w: any) => w === h.solverHand)
  );

  return winners.map(w => ({ playerId: w.playerId, hand: w.hand }));
}

// Get hand ranking name
export function getHandRankName(rank: number): string {
  const names: Record<number, string> = {
    1: 'Royal Flush',
    2: 'Straight Flush',
    3: 'Four of a Kind',
    4: 'Full House',
    5: 'Flush',
    6: 'Straight',
    7: 'Three of a Kind',
    8: 'Two Pair',
    9: 'Pair',
    10: 'High Card'
  };
  return names[rank] || 'Unknown';
}
