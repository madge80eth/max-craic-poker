// Deck management for poker

import { Card, Rank, Suit } from './types';

const SUITS: Suit[] = ['h', 'd', 'c', 's'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

// Create a fresh 52-card deck
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
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

// Deal cards from the deck (mutates deck)
export function dealCards(deck: Card[], count: number): Card[] {
  if (deck.length < count) {
    throw new Error('Not enough cards in deck');
  }
  return deck.splice(0, count);
}

// Convert card to string format for poker-evaluator (e.g., "As", "Kh", "Tc")
export function cardToString(card: Card): string {
  return `${card.rank}${card.suit}`;
}

// Convert string to card
export function stringToCard(str: string): Card {
  if (str.length !== 2) throw new Error(`Invalid card string: ${str}`);
  const rank = str[0] as Rank;
  const suit = str[1] as Suit;
  if (!RANKS.includes(rank)) throw new Error(`Invalid rank: ${rank}`);
  if (!SUITS.includes(suit)) throw new Error(`Invalid suit: ${suit}`);
  return { rank, suit };
}

// Get display name for card
export function getCardDisplayName(card: Card): string {
  const rankNames: Record<Rank, string> = {
    '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
    'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A'
  };
  const suitSymbols: Record<Suit, string> = {
    'h': '♥', 'd': '♦', 'c': '♣', 's': '♠'
  };
  return `${rankNames[card.rank]}${suitSymbols[card.suit]}`;
}

// Get suit color
export function getSuitColor(suit: Suit): 'red' | 'black' {
  return suit === 'h' || suit === 'd' ? 'red' : 'black';
}
