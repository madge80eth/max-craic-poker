// Craic Home Game MTT rebuild — shared types.
// See .strategy/new build/GAME-CREATION-SPEC.md and MTT-SPEC.md for the design.

export type Address = `0x${string}`;

export type Gate =
  | { type: 'erc20MinHold'; token: Address; minAmount: string }
  | { type: 'erc20HeldFor'; token: Address; minAmount: string; minDays: number }
  | { type: 'nftHold'; collection: Address; minCount: number }
  | { type: 'walletAge'; minDays: number }
  | { type: 'allowlist'; addresses: Address[] };

export interface CheckpointResult {
  daysAgo: number;
  blockNumber: number;
  timestamp: number;
  balance: string;
  passed: boolean;
}

export interface GateCheckResult {
  gate: Gate;
  passed: boolean;
  reason?: string;
  blockNumber: number;
  checkpoints?: CheckpointResult[];
}

export interface GateMatrixResult {
  passed: boolean;
  results: GateCheckResult[];
  blockNumber: number;
  checkedAt: number;
}

export type RegistrationStage = 'registration' | 't0';

export interface RegistrationRecord {
  gameId: string;
  wallet: Address;
  registeredAt: number;
  registrationCheck: GateMatrixResult;
  t0Check: GateMatrixResult | null;
  status: 'registered' | 'rejected' | 'unregistered_at_start';
}

// Creation config — matches the sealed craic-create-wizard.jsx onPublish() schema
// (.strategy/new build/sealed/craic-create-wizard.jsx header) plus the gates[]
// array (GAME-CREATION-SPEC §3/§7). P1 (MTT-SPEC) owns tournament lifecycle;
// this is only the creation/gating shell PG1 needs to exist.
export interface GameConfig {
  title: string;
  startsAt: string; // ISO UTC
  timezone: string;
  minPlayers: number;
  visibility: 'public' | 'unlisted';
  structure: {
    levelMins: 6 | 8 | 10 | 12 | 15;
    startingStack: 5000 | 10000 | 20000;
    lateRegLevels: number;
    payoutTemplate: 'top2' | 'top3' | 'top5' | 'top7';
  };
  pool: {
    asset: string; // 'USDC' | 'ETH' | erc20 address
    creatorSeed: number;
  };
  gates: Gate[];
}

export type GameStatus = 'created' | 'registering' | 'running' | 'finished' | 'settled' | 'cancelled';

export interface GameRecord {
  gameId: string;
  config: GameConfig;
  status: GameStatus;
  createdAt: number;
}
