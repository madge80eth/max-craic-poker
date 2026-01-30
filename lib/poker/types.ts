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
  consecutiveTimeouts: number;
  sitOut: boolean;
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
  scheduledStartTime?: number; // UTC timestamp for scheduled start
  tournamentId?: string; // Links tables in the same MTT
  tableNumber?: number; // Table 1, 2, etc. within tournament
  startingChips?: number; // Custom starting chips (default 1500)
  blindIntervalMinutes?: number; // Custom blind interval (default 3)
  sybilResistance?: SybilResistanceConfig; // Sybil resistance settings
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
  consecutiveTimeouts: number;
  sitOut: boolean;
}

export interface ValidAction {
  action: PlayerAction;
  minAmount?: number;
  maxAmount?: number;
}

// Sybil resistance configuration for table creation
export interface SybilResistanceConfig {
  coinbaseVerification: { enabled: boolean };
  addressWhitelist: { enabled: boolean; addresses: string[] };
  nftGating: { enabled: boolean; contractAddress?: string; tokenId?: string };
  tokenGating: { enabled: boolean; contractAddress?: string; minAmount?: string };
  farcasterRequired: { enabled: boolean };
  baseNameRequired: { enabled: boolean };
}

export const DEFAULT_SYBIL_CONFIG: SybilResistanceConfig = {
  coinbaseVerification: { enabled: false },
  addressWhitelist: { enabled: false, addresses: [] },
  nftGating: { enabled: false },
  tokenGating: { enabled: false },
  farcasterRequired: { enabled: false },
  baseNameRequired: { enabled: false },
};

// Check if any sybil requirement is enabled
export function hasSybilRequirements(config: SybilResistanceConfig): boolean {
  return (
    config.coinbaseVerification.enabled ||
    config.addressWhitelist.enabled ||
    config.nftGating.enabled ||
    config.tokenGating.enabled ||
    config.farcasterRequired.enabled ||
    config.baseNameRequired.enabled
  );
}

// Estimate game duration in minutes based on settings
export function estimateGameDuration(startingChips: number, blindIntervalMinutes: number): string {
  // Estimate how many blind levels until the game ends
  // Typical 6-max SNG ends around level 7-8 with 1500 chips
  // Scale proportionally to stack depth
  const stackFactor = startingChips / 1500;
  const baseLevels = 7; // ~7 levels for a 1500-chip game
  const estimatedLevels = Math.round(baseLevels * stackFactor);
  const totalMinutes = estimatedLevels * blindIntervalMinutes;

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${totalMinutes}m`;
}

// Build blind levels for custom starting chips and interval
export function buildBlindLevels(startingChips: number, intervalMinutes: number): BlindLevel[] {
  const durationSeconds = intervalMinutes * 60;
  // Scale blind levels proportionally to starting chips
  const scale = startingChips / 1500;
  const baseLevels = [
    { sb: 10, bb: 20, ante: 0 },
    { sb: 15, bb: 30, ante: 0 },
    { sb: 25, bb: 50, ante: 0 },
    { sb: 50, bb: 100, ante: 10 },
    { sb: 75, bb: 150, ante: 15 },
    { sb: 100, bb: 200, ante: 20 },
    { sb: 150, bb: 300, ante: 30 },
    { sb: 200, bb: 400, ante: 40 },
    { sb: 300, bb: 600, ante: 60 },
    { sb: 400, bb: 800, ante: 80 },
  ];

  return baseLevels.map((l, i) => ({
    level: i + 1,
    smallBlind: Math.round(l.sb * scale),
    bigBlind: Math.round(l.bb * scale),
    ante: Math.round(l.ante * scale),
    duration: durationSeconds,
  }));
}

// Default game configuration for 6-max SNG
export const DEFAULT_CONFIG: GameConfig = {
  maxPlayers: 6,
  startingChips: 1500,
  blindLevels: [
    { level: 1, smallBlind: 10, bigBlind: 20, ante: 0, duration: 180 },
    { level: 2, smallBlind: 15, bigBlind: 30, ante: 0, duration: 180 },
    { level: 3, smallBlind: 25, bigBlind: 50, ante: 0, duration: 180 },
    { level: 4, smallBlind: 50, bigBlind: 100, ante: 10, duration: 180 },
    { level: 5, smallBlind: 75, bigBlind: 150, ante: 15, duration: 180 },
    { level: 6, smallBlind: 100, bigBlind: 200, ante: 20, duration: 180 },
    { level: 7, smallBlind: 150, bigBlind: 300, ante: 30, duration: 180 },
    { level: 8, smallBlind: 200, bigBlind: 400, ante: 40, duration: 180 },
    { level: 9, smallBlind: 300, bigBlind: 600, ante: 60, duration: 180 },
    { level: 10, smallBlind: 400, bigBlind: 800, ante: 80, duration: 180 },
  ],
  actionTimeout: 30,
  payoutStructure: [65, 35], // Top 2 pay
};
