// Poker game type definitions

export type Suit = 'h' | 'd' | 'c' | 's'; // hearts, diamonds, clubs, spades
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished';

export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'allin';

export interface Player {
  odentity: string; // wallet address or FID
  name: string;
  odentity_label?: string; // .base.eth name if available
  seatIndex: number;
  chips: number;
  bet: number; // current round bet
  totalBet: number; // total bet this hand
  holeCards: Card[];
  folded: boolean;
  allIn: boolean;
  disconnected: boolean;
  lastAction?: PlayerAction;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
}

export interface SidePot {
  amount: number;
  eligiblePlayers: string[]; // player identities
}

export interface BlindLevel {
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  duration: number; // seconds
}

export interface GameConfig {
  maxPlayers: 6;
  startingChips: number;
  blindLevels: BlindLevel[];
  actionTimeout: number; // seconds per action
  payoutStructure: number[]; // percentages, e.g. [65, 35] for top 2
}

export interface GameState {
  tableId: string;
  phase: GamePhase;
  pot: number;
  sidePots: SidePot[];
  communityCards: Card[];
  currentBet: number; // highest bet this round
  minRaise: number; // minimum raise amount
  dealerIndex: number;
  activePlayerIndex: number; // whose turn
  players: Player[];
  deck: Card[]; // remaining cards (server only)
  blindLevel: number;
  blindLevelStartTime: number;
  handNumber: number;
  lastActionTime: number;
  winners?: WinnerInfo[];
  config: GameConfig;
}

export interface WinnerInfo {
  odentity: string;
  amount: number;
  handName: string;
  cards: Card[];
}

export interface GameAction {
  type: PlayerAction;
  amount?: number; // for raise
  playerId: string;
}

export interface TableInfo {
  tableId: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  blinds: string; // e.g. "25/50"
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
  creatorId: string;
}

// Client-safe game state (hides other players' hole cards and deck)
export interface ClientGameState {
  tableId: string;
  phase: GamePhase;
  pot: number;
  sidePots: SidePot[];
  communityCards: Card[];
  currentBet: number;
  minRaise: number;
  dealerIndex: number;
  activePlayerIndex: number;
  players: ClientPlayer[];
  blindLevel: number;
  blindLevelStartTime: number;
  handNumber: number;
  lastActionTime: number;
  winners?: WinnerInfo[];
  config: GameConfig;
  yourSeatIndex: number | null;
  validActions: ValidAction[];
}

export interface ClientPlayer {
  odentity: string;
  name: string;
  seatIndex: number;
  chips: number;
  bet: number;
  folded: boolean;
  allIn: boolean;
  disconnected: boolean;
  lastAction?: PlayerAction;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  holeCards: Card[] | null; // only visible for own cards or at showdown
  showCards: boolean;
}

export interface ValidAction {
  action: PlayerAction;
  minAmount?: number;
  maxAmount?: number;
}

// Default game configuration for 6-max SNG
export const DEFAULT_CONFIG: GameConfig = {
  maxPlayers: 6,
  startingChips: 1500,
  blindLevels: [
    { level: 1, smallBlind: 10, bigBlind: 20, ante: 0, duration: 600 },
    { level: 2, smallBlind: 15, bigBlind: 30, ante: 0, duration: 600 },
    { level: 3, smallBlind: 25, bigBlind: 50, ante: 0, duration: 600 },
    { level: 4, smallBlind: 50, bigBlind: 100, ante: 10, duration: 600 },
    { level: 5, smallBlind: 75, bigBlind: 150, ante: 15, duration: 600 },
    { level: 6, smallBlind: 100, bigBlind: 200, ante: 20, duration: 600 },
    { level: 7, smallBlind: 150, bigBlind: 300, ante: 30, duration: 600 },
    { level: 8, smallBlind: 200, bigBlind: 400, ante: 40, duration: 600 },
    { level: 9, smallBlind: 300, bigBlind: 600, ante: 60, duration: 600 },
    { level: 10, smallBlind: 400, bigBlind: 800, ante: 80, duration: 600 },
  ],
  actionTimeout: 30,
  payoutStructure: [65, 35], // Top 2 pay
};
