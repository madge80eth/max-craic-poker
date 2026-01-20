// Sponsored tournament type definitions

export type SponsoredTournamentStatus =
  | 'pending'    // Created, waiting for sponsor
  | 'sponsored'  // Sponsor deposited, waiting for players
  | 'active'     // All players joined, game in progress
  | 'completed'  // Game finished, payouts done
  | 'cancelled'; // Cancelled, refunds available

export interface SponsoredTournament {
  tournamentId: string;       // bytes32 from contract (hex string)
  tableId: string;            // Links to poker game table
  contractAddress: string;    // Address of deployed contract (or factory if using one)

  // Sponsor info
  sponsor: string | null;     // Sponsor wallet address
  prizePool: number;          // Prize pool in cents (USDC * 100)
  bondAmount: number;         // Required bond per player in cents

  // Game info
  maxPlayers: number;         // Max players (6 for 6-max)
  playerCount: number;        // Current player count
  players: SponsoredPlayer[]; // Player list with bond status

  // Status
  status: SponsoredTournamentStatus;
  createdAt: number;          // Unix timestamp
  startedAt: number | null;
  completedAt: number | null;

  // Results (after completion)
  winner?: string;            // 1st place wallet
  second?: string;            // 2nd place wallet
  winnerPayout?: number;      // Total payout to winner (bond + prize)
  secondPayout?: number;      // Total payout to 2nd
}

export interface SponsoredPlayer {
  wallet: string;
  seatIndex: number;
  bonded: boolean;
  refunded: boolean;
  name?: string;              // From poker game
}

export interface CreateSponsoredTournamentParams {
  tableId: string;
  bondAmount: number;         // In cents (e.g., 1000 = $10)
  maxPlayers: number;         // Usually 6
}

export interface SponsorTournamentParams {
  tournamentId: string;
  prizePoolAmount: number;    // In cents (e.g., 5000 = $50)
}

export interface EnterTournamentParams {
  tournamentId: string;
  seatIndex: number;
  playerWallet: string;
}

export interface FinishTournamentParams {
  tournamentId: string;
  winner: string;             // 1st place wallet
  second: string;             // 2nd place wallet
  otherPlayers: string[];     // Other player wallets (get bonds back)
}

// Contract ABI for SponsoredTournament
export const SPONSORED_TOURNAMENT_ABI = [
  // Read functions
  {
    inputs: [{ name: 'tournamentId', type: 'bytes32' }],
    name: 'getTournament',
    outputs: [
      {
        components: [
          { name: 'tableId', type: 'string' },
          { name: 'sponsor', type: 'address' },
          { name: 'prizePool', type: 'uint256' },
          { name: 'bondAmount', type: 'uint256' },
          { name: 'maxPlayers', type: 'uint256' },
          { name: 'playerCount', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'startedAt', type: 'uint256' },
          { name: 'completedAt', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tournamentId', type: 'bytes32' },
      { name: 'seatIndex', type: 'uint256' },
    ],
    name: 'getPlayerEntry',
    outputs: [
      {
        components: [
          { name: 'player', type: 'address' },
          { name: 'bonded', type: 'bool' },
          { name: 'refunded', type: 'bool' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tournamentId', type: 'bytes32' }],
    name: 'getTournamentPlayers',
    outputs: [{ name: 'players', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tournamentId', type: 'bytes32' },
      { name: 'player', type: 'address' },
    ],
    name: 'hasJoined',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'firstPlacePercent',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'secondPlacePercent',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },

  // Write functions
  {
    inputs: [
      { name: 'tableId', type: 'string' },
      { name: 'bondAmount', type: 'uint256' },
      { name: 'maxPlayers', type: 'uint256' },
    ],
    name: 'createTournament',
    outputs: [{ name: 'tournamentId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tournamentId', type: 'bytes32' },
      { name: 'prizePoolAmount', type: 'uint256' },
    ],
    name: 'sponsorTournament',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tournamentId', type: 'bytes32' },
      { name: 'seatIndex', type: 'uint256' },
    ],
    name: 'enterTournament',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'tournamentId', type: 'bytes32' }],
    name: 'startTournament',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tournamentId', type: 'bytes32' },
      { name: 'winner', type: 'address' },
      { name: 'second', type: 'address' },
      { name: 'otherPlayers', type: 'address[]' },
    ],
    name: 'finishTournament',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tournamentId', type: 'bytes32' },
      { name: 'reason', type: 'string' },
    ],
    name: 'cancelTournament',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'tournamentId', type: 'bytes32' }],
    name: 'emergencyWithdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tournamentId', type: 'bytes32' },
      { indexed: false, name: 'tableId', type: 'string' },
      { indexed: false, name: 'bondAmount', type: 'uint256' },
      { indexed: false, name: 'maxPlayers', type: 'uint256' },
    ],
    name: 'TournamentCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tournamentId', type: 'bytes32' },
      { indexed: true, name: 'sponsor', type: 'address' },
      { indexed: false, name: 'prizePool', type: 'uint256' },
    ],
    name: 'TournamentSponsored',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tournamentId', type: 'bytes32' },
      { indexed: true, name: 'player', type: 'address' },
      { indexed: false, name: 'seatIndex', type: 'uint256' },
      { indexed: false, name: 'bondAmount', type: 'uint256' },
    ],
    name: 'PlayerEntered',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tournamentId', type: 'bytes32' },
      { indexed: false, name: 'playerCount', type: 'uint256' },
    ],
    name: 'TournamentStarted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tournamentId', type: 'bytes32' },
      { indexed: true, name: 'winner', type: 'address' },
      { indexed: true, name: 'second', type: 'address' },
      { indexed: false, name: 'winnerPayout', type: 'uint256' },
      { indexed: false, name: 'secondPayout', type: 'uint256' },
    ],
    name: 'TournamentCompleted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tournamentId', type: 'bytes32' },
      { indexed: true, name: 'player', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'PlayerRefunded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tournamentId', type: 'bytes32' },
      { indexed: false, name: 'reason', type: 'string' },
    ],
    name: 'TournamentCancelled',
    type: 'event',
  },
] as const;

// ERC20 ABI for USDC approve
export const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Contract addresses (to be updated after deployment)
export const CONTRACTS = {
  // Base mainnet USDC
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,

  // Sponsored Tournament contract (UPDATE AFTER DEPLOYMENT)
  SPONSORED_TOURNAMENT: '0x0000000000000000000000000000000000000000' as `0x${string}`,
} as const;

// Helper to convert cents to USDC (6 decimals)
export function centsToUsdc(cents: number): bigint {
  // cents -> dollars -> USDC units (6 decimals)
  // $10 = 1000 cents = 10_000_000 USDC units
  return BigInt(cents) * BigInt(10_000); // cents * 10000 = USDC units
}

// Helper to convert USDC (6 decimals) to cents
export function usdcToCents(usdc: bigint): number {
  return Number(usdc / BigInt(10_000));
}

// Status enum mapping (matches contract)
export const STATUS_MAP: Record<number, SponsoredTournamentStatus> = {
  0: 'pending',
  1: 'sponsored',
  2: 'active',
  3: 'completed',
  4: 'cancelled',
};
