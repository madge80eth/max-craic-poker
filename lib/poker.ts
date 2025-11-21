// lib/poker.ts
// Poker hand generation and evaluation utilities

// Card representation
export type Suit = 'S' | 'H' | 'D' | 'C'; // Spades, Hearts, Diamonds, Clubs
export type Rank = 'A' | 'K' | 'Q' | 'J' | 'T' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';
export type Card = `${Rank}${Suit}`; // e.g., "AS" = Ace of Spades

// Hand ranking names (1-10 scale)
export const HAND_RANKINGS = {
  1: 'High Card',
  2: 'One Pair',
  3: 'Two Pair',
  4: 'Three of a Kind',
  5: 'Straight',
  6: 'Flush',
  7: 'Full House',
  8: 'Four of a Kind',
  9: 'Straight Flush',
  10: 'Royal Flush'
} as const;

export type HandRankValue = keyof typeof HAND_RANKINGS;
export type HandRankName = typeof HAND_RANKINGS[HandRankValue];

// Full deck
const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const RANKS: Rank[] = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}` as Card);
    }
  }
  return deck;
}

// Fisher-Yates shuffle
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Deal 5 cards from shuffled deck
export function dealHand(): Card[] {
  const deck = shuffleDeck(createDeck());
  return deck.slice(0, 5);
}

// Get numeric rank value (Ace = 14, King = 13, etc.)
function getRankValue(rank: Rank): number {
  const values: Record<Rank, number> = {
    'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10,
    '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
  };
  return values[rank];
}

// Parse card into rank and suit
function parseCard(card: Card): { rank: Rank; suit: Suit } {
  return {
    rank: card[0] as Rank,
    suit: card[1] as Suit
  };
}

// Evaluate a 5-card hand
export function evaluateHand(cards: Card[]): { rankValue: HandRankValue; rankName: HandRankName; subRank: number } {
  if (cards.length !== 5) {
    throw new Error('Hand must have exactly 5 cards');
  }

  const parsed = cards.map(parseCard);
  const ranks = parsed.map(c => c.rank);
  const suits = parsed.map(c => c.suit);
  const values = ranks.map(getRankValue).sort((a, b) => b - a);

  // Count occurrences of each rank
  const rankCounts: Record<number, number> = {};
  for (const v of values) {
    rankCounts[v] = (rankCounts[v] || 0) + 1;
  }
  const counts = Object.values(rankCounts).sort((a, b) => b - a);

  // Check for flush
  const isFlush = suits.every(s => s === suits[0]);

  // Check for straight (including wheel: A-2-3-4-5)
  const isStraight = checkStraight(values);
  const isWheel = values.join(',') === '14,5,4,3,2'; // A-5 low straight

  // Calculate sub-rank for tiebreaking (higher = better)
  const subRank = calculateSubRank(values, rankCounts);

  // Royal Flush: A-K-Q-J-T all same suit
  if (isFlush && values.join(',') === '14,13,12,11,10') {
    return { rankValue: 10, rankName: 'Royal Flush', subRank };
  }

  // Straight Flush
  if (isFlush && isStraight) {
    return { rankValue: 9, rankName: 'Straight Flush', subRank };
  }

  // Four of a Kind
  if (counts[0] === 4) {
    return { rankValue: 8, rankName: 'Four of a Kind', subRank };
  }

  // Full House
  if (counts[0] === 3 && counts[1] === 2) {
    return { rankValue: 7, rankName: 'Full House', subRank };
  }

  // Flush
  if (isFlush) {
    return { rankValue: 6, rankName: 'Flush', subRank };
  }

  // Straight
  if (isStraight) {
    return { rankValue: 5, rankName: 'Straight', subRank };
  }

  // Three of a Kind
  if (counts[0] === 3) {
    return { rankValue: 4, rankName: 'Three of a Kind', subRank };
  }

  // Two Pair
  if (counts[0] === 2 && counts[1] === 2) {
    return { rankValue: 3, rankName: 'Two Pair', subRank };
  }

  // One Pair
  if (counts[0] === 2) {
    return { rankValue: 2, rankName: 'One Pair', subRank };
  }

  // High Card
  return { rankValue: 1, rankName: 'High Card', subRank };
}

function checkStraight(values: number[]): boolean {
  const sorted = [...values].sort((a, b) => b - a);

  // Check normal straight
  let isNormalStraight = true;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i] - sorted[i + 1] !== 1) {
      isNormalStraight = false;
      break;
    }
  }

  // Check wheel (A-5 low straight)
  const isWheel = sorted.join(',') === '14,5,4,3,2';

  return isNormalStraight || isWheel;
}

// Calculate a numeric sub-rank for tiebreaking
function calculateSubRank(values: number[], rankCounts: Record<number, number>): number {
  // Create a score based on the pattern and high cards
  // This gives a unique value for comparing hands of the same rank
  let score = 0;
  const sortedByCount = Object.entries(rankCounts)
    .map(([val, count]) => ({ value: parseInt(val), count }))
    .sort((a, b) => b.count - a.count || b.value - a.value);

  for (let i = 0; i < sortedByCount.length; i++) {
    score += sortedByCount[i].value * Math.pow(15, sortedByCount.length - i - 1);
  }
  return score;
}

// Hand result interface for storage
export interface HandResult {
  cards: Card[];
  handRank: HandRankName;
  rankValue: HandRankValue;
  subRank: number;
  placement: number;
  totalUsers: number;
  ticketsEarned: number;
  playedAt: number;
}

// Calculate tickets based on percentile placement
export function calculateTickets(placement: number, totalUsers: number): number {
  if (totalUsers === 0) return 1;

  const percentile = (placement / totalUsers) * 100;

  // Top 20%: 5 tickets
  if (percentile <= 20) return 5;
  // 20-40%: 4 tickets
  if (percentile <= 40) return 4;
  // 40-60%: 3 tickets
  if (percentile <= 60) return 3;
  // 60-80%: 2 tickets
  if (percentile <= 80) return 2;
  // Bottom 20%: 1 ticket
  return 1;
}

// Compare two hands: returns negative if hand1 < hand2, positive if hand1 > hand2, 0 if equal
export function compareHands(hand1: { rankValue: number; subRank: number }, hand2: { rankValue: number; subRank: number }): number {
  if (hand1.rankValue !== hand2.rankValue) {
    return hand1.rankValue - hand2.rankValue;
  }
  return hand1.subRank - hand2.subRank;
}

// Get display info for a card
export function getCardDisplay(card: Card): { rank: string; suit: string; suitSymbol: string; color: 'red' | 'black' } {
  const { rank, suit } = parseCard(card);
  const suitSymbols: Record<Suit, string> = {
    'S': '♠',
    'H': '♥',
    'D': '♦',
    'C': '♣'
  };
  const suitNames: Record<Suit, string> = {
    'S': 'Spades',
    'H': 'Hearts',
    'D': 'Diamonds',
    'C': 'Clubs'
  };
  const color: 'red' | 'black' = (suit === 'H' || suit === 'D') ? 'red' : 'black';

  return {
    rank: rank === 'T' ? '10' : rank,
    suit: suitNames[suit],
    suitSymbol: suitSymbols[suit],
    color
  };
}
