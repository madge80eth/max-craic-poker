// Craic Protocol type definitions

export type BlindSpeed = 'turbo' | 'standard' | 'deep';

export interface BlindLevelConfig {
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  duration: number; // seconds
}

// Blind level presets
export const BLIND_PRESETS: Record<BlindSpeed, BlindLevelConfig[]> = {
  turbo: [
    { level: 1, smallBlind: 15, bigBlind: 30, ante: 0, duration: 300 },
    { level: 2, smallBlind: 25, bigBlind: 50, ante: 0, duration: 300 },
    { level: 3, smallBlind: 50, bigBlind: 100, ante: 10, duration: 300 },
    { level: 4, smallBlind: 75, bigBlind: 150, ante: 15, duration: 300 },
    { level: 5, smallBlind: 100, bigBlind: 200, ante: 25, duration: 300 },
    { level: 6, smallBlind: 150, bigBlind: 300, ante: 30, duration: 300 },
    { level: 7, smallBlind: 200, bigBlind: 400, ante: 50, duration: 300 },
    { level: 8, smallBlind: 300, bigBlind: 600, ante: 75, duration: 300 },
    { level: 9, smallBlind: 400, bigBlind: 800, ante: 100, duration: 300 },
    { level: 10, smallBlind: 500, bigBlind: 1000, ante: 125, duration: 300 },
  ],
  standard: [
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
  deep: [
    { level: 1, smallBlind: 10, bigBlind: 20, ante: 0, duration: 900 },
    { level: 2, smallBlind: 15, bigBlind: 30, ante: 0, duration: 900 },
    { level: 3, smallBlind: 20, bigBlind: 40, ante: 0, duration: 900 },
    { level: 4, smallBlind: 30, bigBlind: 60, ante: 0, duration: 900 },
    { level: 5, smallBlind: 40, bigBlind: 80, ante: 10, duration: 900 },
    { level: 6, smallBlind: 50, bigBlind: 100, ante: 10, duration: 900 },
    { level: 7, smallBlind: 75, bigBlind: 150, ante: 15, duration: 900 },
    { level: 8, smallBlind: 100, bigBlind: 200, ante: 20, duration: 900 },
    { level: 9, smallBlind: 150, bigBlind: 300, ante: 30, duration: 900 },
    { level: 10, smallBlind: 200, bigBlind: 400, ante: 40, duration: 900 },
  ],
};

// Game configuration — stored in Redis, matches CraicHomeGame.sol
export interface CraicGameConfig {
  gameId: string;
  gameName: string;
  description?: string;
  host: string;
  buyInToken: string;         // ERC-20 address, address(0) for ETH, '' for free
  buyInAmount: string;        // raw token units as string
  protocolFeeBps: number;     // basis points, default 100 (1%)
  entryMode: 'open' | 'token_gated' | 'leaderboard' | 'whitelist';
  whitelist?: string[];       // wallet addresses, only if entryMode === 'whitelist'
  blindSpeed: BlindSpeed;
  startingStack: number;
  maxPlayersPerTable: number; // always 6
  scheduledStart?: string;    // ISO datetime string, optional
  createdAt: number;
  status: CraicGameStatus;
  gameHash?: string;          // bytes32 from contract
}

// Game status
export type CraicGameStatus = 'waiting' | 'active' | 'finished' | 'cancelled';

// Game info for lobby display
export interface CraicGameInfo {
  gameId: string;
  gameName?: string;
  host: string;
  buyInToken: string;
  buyInAmount: string;
  playerCount: number;
  maxPlayersPerTable: number;
  status: CraicGameStatus;
  blindSpeed: BlindSpeed;
  startingStack: number;
  entryMode: 'open' | 'token_gated' | 'leaderboard' | 'whitelist';
  createdAt: number;
}

// Wizard form state
export interface CreateGameFormState {
  gameName: string;
  description: string;
  startingStack: number;
  blindSpeed: BlindSpeed;
  buyInToken: string;
  buyInAmount: string;
  protocolFeeBps: number;
  entryMode: 'open' | 'token_gated' | 'leaderboard' | 'whitelist';
  whitelist?: string[];
  tokenGateAddress?: string;
  tokenGateMinBalance?: string;
  leaderboardAddress?: string;
  leaderboardLimit?: number;
  scheduledStart?: string;    // ISO datetime string, empty = immediate
}

// Default form state
export const DEFAULT_CREATE_FORM: CreateGameFormState = {
  gameName: '',
  description: '',
  startingStack: 3000,
  blindSpeed: 'standard',
  buyInToken: '',
  buyInAmount: '0',
  protocolFeeBps: 100,
  entryMode: 'token_gated',
};

// Calculate estimated game time based on settings
export function estimateGameTime(startingStack: number, blindSpeed: BlindSpeed, playerCount: number = 6): number {
  // Rough estimation based on typical tournament length
  // Turbo: ~30 mins, Standard: ~60 mins, Deep: ~90 mins for 6 players
  const baseMinutes = {
    turbo: 30,
    standard: 60,
    deep: 90,
  };

  // Adjust for stack depth
  const stackMultiplier = startingStack / 1500;

  // Adjust for player count
  const playerMultiplier = playerCount / 6;

  return Math.round(baseMinutes[blindSpeed] * stackMultiplier * playerMultiplier);
}

// USDC contract address on Base
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Bracket tournament state — stored at craic:bracket:{parentGameId}
export interface BracketState {
  parentGameId: string;
  rounds: BracketRound[];
  currentRound: number;
  totalPlayers: number;
  status: 'waiting' | 'active' | 'complete';
}

export interface BracketRound {
  roundNumber: number;
  tables: string[];       // gameIds of table instances
  winners: string[];      // wallet addresses advancing
  byes: string[];         // wallet addresses with byes
  status: 'active' | 'complete';
}

// Payout structure derived from table count, not raw player count.
//   1 table  (1-6 players)  → top 2: 65/35
//   2 tables (7-12 players) → top 3: 50/30/20
//   4 tables (13-24 players)→ top 4: 40/25/20/15
//   8 tables (25-48 players)→ top 5: 35/22/18/14/11
// Table count = ceil(playerCount / 6) rounded up to nearest bracket (1,2,4,8).
export function getPayoutStructure(playerCount: number): number[] {
  if (playerCount <= 1) return [100];
  const rawTables = Math.ceil(playerCount / 6);
  let bracket: number;
  if (rawTables <= 1) bracket = 1;
  else if (rawTables <= 2) bracket = 2;
  else if (rawTables <= 4) bracket = 4;
  else bracket = 8;

  if (bracket === 1) return [65, 35];
  if (bracket === 2) return [50, 30, 20];
  if (bracket === 4) return [40, 25, 20, 15];
  return [35, 22, 18, 14, 11];
}
