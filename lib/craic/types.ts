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

// Sybil protection options
export interface SybilOptions {
  tokenGating: {
    enabled: boolean;
    contractAddress?: string;
    minAmount?: string; // Minimum token amount (human-readable, e.g. "100")
  };
  nftGating: {
    enabled: boolean;
    contractAddress?: string;
    tokenId?: string; // For ERC-1155, optional for ERC-721
    isERC1155?: boolean;
  };
  whitelistAddress: {
    enabled: boolean;
    addresses?: string[]; // Array of allowed wallet addresses
  };
  bondMechanic: {
    enabled: boolean;
    amount?: number; // USDC amount (in cents, e.g., 1000 = $10)
  };
  coinbaseVerification: {
    enabled: boolean;
  };
}

// Game configuration
export interface CraicGameConfig {
  gameId: string;
  host: string; // Creator wallet address
  prizePool: number; // USDC in cents
  bondAmount: number; // USDC in cents (0 if no bond)
  maxPlayers: number;
  startingStack: number;
  blindSpeed: BlindSpeed;
  sybilOptions: SybilOptions;
  // Contract reference
  tournamentId?: string; // bytes32 from contract
  // Timestamps
  createdAt: number;
  startedAt?: number;
}

// Game status
export type CraicGameStatus = 'waiting' | 'active' | 'completed' | 'cancelled' | 'finished';

// Game info for lobby display
export interface CraicGameInfo {
  gameId: string;
  host: string;
  prizePool: number;
  bondAmount: number;
  playerCount: number;
  maxPlayers: number;
  status: CraicGameStatus;
  blindSpeed: BlindSpeed;
  startingStack: number;
  sybilOptions: SybilOptions;
  createdAt: number;
}

// Wizard form state
export interface CreateGameFormState {
  // Step 1: Game Settings
  startingStack: number;
  blindSpeed: BlindSpeed;
  // Step 2: Sybil Options
  sybilOptions: SybilOptions;
  // Step 3: Prize Pool
  prizePool: number;
}

// Default form state
export const DEFAULT_CREATE_FORM: CreateGameFormState = {
  startingStack: 1500,
  blindSpeed: 'standard',
  sybilOptions: {
    tokenGating: { enabled: false },
    nftGating: { enabled: false },
    whitelistAddress: { enabled: false },
    bondMechanic: { enabled: false },
    coinbaseVerification: { enabled: false },
  },
  prizePool: 0,
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

// Coinbase Verified Account schema ID (EAS on Base)
export const COINBASE_VERIFIED_SCHEMA_ID = '0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9';

// Payout structure: 65/35 to top 2 (matches SponsoredTournament.sol contract)
export function getPayoutStructure(_playerCount: number): number[] {
  // All formats use 65/35 split to top 2
  // This matches the on-chain contract's firstPlacePercent/secondPlacePercent
  if (_playerCount <= 1) return [100];
  return [65, 35];
}
