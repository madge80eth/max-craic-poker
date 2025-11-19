// types/index.ts

export interface UserStats {
  walletAddress: string;
  totalEntries: number;
  tournamentsAssigned: number;
  lastThreeDrawIds: string[]; // Track last 3 draw IDs entered
  currentStreak: number; // Calculated: 3 consecutive = streak active
}

export interface Winner {
  walletAddress: string;
  position: 1 | 2 | 3 | 4 | 5 | 6;
  assignedTournament: string;
  basePercentage: number;
  sharingBonus: number; // 0 or 2
  streakMultiplier: number; // 1 or 1.5
  finalPercentage: number;
  tournamentResult: 'pending' | 'cashed' | 'busted';
  payout: number;
}

export interface DrawResult {
  drawId: string;
  timestamp: number;
  winners: Winner[];
}

// ============================================
// POKER TOURNAMENT TYPES (Sessions 1-15)
// ============================================

export type GameStatus = 'registration' | 'countdown' | 'active' | 'completed';
export type PlayerStatus = 'active' | 'sitting-out' | 'eliminated';
export type PlayerAction = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

export interface TournamentConfig {
  tournamentId: string;
  startTime: number; // Unix timestamp
  registrationEndsAt: number; // 30 mins before start
  smallBlind: number;
  bigBlind: number;
  startingChips: number;
  blindIncreaseInterval: number; // 5 minutes in ms
  actionTimeout: number; // 30 seconds in ms
  maxPlayers: number; // 6 (6-max format)
}

export interface Player {
  walletAddress: string;
  seatPosition: number; // 1-6 (6-max)
  chipStack: number;
  status: PlayerStatus;
  missedHands: number; // For "Deal Me In" 2FA system
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  currentBet: number;
  totalBetThisRound: number;
  cards: string[]; // ['Ah', 'Kd'] or [] if folded/no cards
  lastAction?: PlayerAction;
  lastActionTime?: number;
}

export interface GameState {
  tournamentId: string;
  status: GameStatus;
  currentHandNumber: number;
  dealerPosition: number; // Seat number
  smallBlindPosition: number;
  bigBlindPosition: number;
  currentBlindLevel: number;
  smallBlind: number;
  bigBlind: number;
  pot: number;
  communityCards: string[]; // ['Ah', 'Kd', '3c', '4s', '5h']
  currentBettingRound: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  activePlayerPosition: number; // Whose turn it is
  players: Player[];
  sidePots: SidePot[];
  lastUpdate: number; // Unix timestamp
  dealMeInDeadline?: number; // Initial 3-min deadline for first "Deal Me In"
}

export interface SidePot {
  amount: number;
  eligiblePlayers: string[]; // Wallet addresses
}

export interface TournamentAction {
  tournamentId: string;
  walletAddress: string;
  action: PlayerAction;
  amount?: number; // For bet/raise
  timestamp: number;
}

export interface TournamentResult {
  tournamentId: string;
  completedAt: number;
  winners: TournamentWinner[];
}

export interface TournamentWinner {
  walletAddress: string;
  position: 1 | 2 | 3;
  prizeAmount: number; // Cash prize
  equityPercentage: number; // 5% in games 3-6
}
