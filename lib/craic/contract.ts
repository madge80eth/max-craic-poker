// Craic Tournament contract interaction helpers

import { createPublicClient, http, Address, parseAbi, encodeFunctionData } from 'viem';
import { base } from 'viem/chains';
import { USDC_ADDRESS } from './types';

// Contract ABI for CraicTournament
export const CRAIC_TOURNAMENT_ABI = parseAbi([
  // Read functions
  'function getTournament(bytes32 tournamentId) view returns ((string gameId, address host, uint256 prizePool, uint256 bondAmount, uint8 maxPlayers, uint8 playerCount, uint8 status, (address nftContract, uint256 nftTokenId, bool isERC1155, bool requireCoinbaseVerification) sybilOptions, uint256 createdAt, uint256 startedAt, uint256 completedAt))',
  'function getPlayerEntry(bytes32 tournamentId, uint256 seatIndex) view returns ((address player, bool bonded, bool refunded))',
  'function getTournamentPlayers(bytes32 tournamentId) view returns (address[])',
  'function canJoin(bytes32 tournamentId, address player) view returns (bool canJoinResult, string reason)',
  'function hasJoined(bytes32 tournamentId, address player) view returns (bool)',

  // Write functions
  'function createTournament(string gameId, uint256 prizePoolAmount, uint256 bondAmount, uint8 maxPlayers, (address nftContract, uint256 nftTokenId, bool isERC1155, bool requireCoinbaseVerification) sybilOptions) returns (bytes32)',
  'function joinTournament(bytes32 tournamentId, uint256 seatIndex)',
  'function startTournament(bytes32 tournamentId)',
  'function finishTournament(bytes32 tournamentId, address winner, address second, address[] otherPlayers)',
  'function cancelTournament(bytes32 tournamentId, string reason)',
  'function hostCancelTimeout(bytes32 tournamentId)',

  // Events
  'event TournamentCreated(bytes32 indexed tournamentId, string gameId, address indexed host, uint256 prizePool, uint256 bondAmount, uint8 maxPlayers)',
  'event PlayerJoined(bytes32 indexed tournamentId, address indexed player, uint256 seatIndex)',
  'event TournamentStarted(bytes32 indexed tournamentId, uint8 playerCount)',
  'event TournamentCompleted(bytes32 indexed tournamentId, address indexed winner, address indexed second, uint256 winnerPayout, uint256 secondPayout)',
  'event PlayerRefunded(bytes32 indexed tournamentId, address indexed player, uint256 amount)',
  'event TournamentCancelled(bytes32 indexed tournamentId, string reason)',
]);

// ERC-20 ABI for USDC approval
export const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
]);

// Contract address (to be deployed)
export const CRAIC_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CRAIC_CONTRACT_ADDRESS as Address || '0x0000000000000000000000000000000000000000';

// Public client for reading
const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});

// Tournament status enum (matches contract)
export enum TournamentStatus {
  Waiting = 0,
  Active = 1,
  Completed = 2,
  Cancelled = 3,
}

// Type for sybil options in contract format
export interface ContractSybilOptions {
  nftContract: Address;
  nftTokenId: bigint;
  isERC1155: boolean;
  requireCoinbaseVerification: boolean;
}

// Convert USDC cents to contract amount (6 decimals)
export function centsToUSDC(cents: number): bigint {
  return BigInt(cents) * BigInt(10000); // cents to 6 decimals
}

// Convert contract USDC to cents
export function usdcToCents(amount: bigint): number {
  return Number(amount / BigInt(10000));
}

/**
 * Get tournament data from contract
 */
export async function getTournament(tournamentId: `0x${string}`) {
  try {
    const result = await publicClient.readContract({
      address: CRAIC_CONTRACT_ADDRESS,
      abi: CRAIC_TOURNAMENT_ABI,
      functionName: 'getTournament',
      args: [tournamentId],
    });
    return result;
  } catch (error) {
    console.error('Error getting tournament:', error);
    return null;
  }
}

/**
 * Check if player can join tournament
 */
export async function canJoinTournament(
  tournamentId: `0x${string}`,
  playerAddress: Address
): Promise<{ canJoin: boolean; reason: string }> {
  try {
    const [canJoinResult, reason] = await publicClient.readContract({
      address: CRAIC_CONTRACT_ADDRESS,
      abi: CRAIC_TOURNAMENT_ABI,
      functionName: 'canJoin',
      args: [tournamentId, playerAddress],
    });
    return { canJoin: canJoinResult, reason };
  } catch (error) {
    console.error('Error checking join eligibility:', error);
    return { canJoin: false, reason: 'Error checking eligibility' };
  }
}

/**
 * Get USDC balance and allowance for contract
 */
export async function getUSDCStatus(walletAddress: Address): Promise<{
  balance: bigint;
  allowance: bigint;
}> {
  try {
    const [balance, allowance] = await Promise.all([
      publicClient.readContract({
        address: USDC_ADDRESS as Address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [walletAddress],
      }),
      publicClient.readContract({
        address: USDC_ADDRESS as Address,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [walletAddress, CRAIC_CONTRACT_ADDRESS],
      }),
    ]);
    return { balance, allowance };
  } catch (error) {
    console.error('Error getting USDC status:', error);
    return { balance: BigInt(0), allowance: BigInt(0) };
  }
}

/**
 * Encode createTournament call data
 */
export function encodeCreateTournament(
  gameId: string,
  prizePoolCents: number,
  bondAmountCents: number,
  maxPlayers: number,
  sybilOptions: ContractSybilOptions
): `0x${string}` {
  return encodeFunctionData({
    abi: CRAIC_TOURNAMENT_ABI,
    functionName: 'createTournament',
    args: [
      gameId,
      centsToUSDC(prizePoolCents),
      centsToUSDC(bondAmountCents),
      maxPlayers,
      sybilOptions,
    ],
  });
}

/**
 * Encode joinTournament call data
 */
export function encodeJoinTournament(
  tournamentId: `0x${string}`,
  seatIndex: number
): `0x${string}` {
  return encodeFunctionData({
    abi: CRAIC_TOURNAMENT_ABI,
    functionName: 'joinTournament',
    args: [tournamentId, BigInt(seatIndex)],
  });
}

/**
 * Encode USDC approve call data
 */
export function encodeApproveUSDC(amount: bigint): `0x${string}` {
  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [CRAIC_CONTRACT_ADDRESS, amount],
  });
}

/**
 * Format sybil options for contract call
 */
export function formatSybilOptionsForContract(
  nftGating?: { enabled: boolean; contractAddress?: string; tokenId?: string; isERC1155?: boolean },
  coinbaseVerification?: { enabled: boolean }
): ContractSybilOptions {
  return {
    nftContract: (nftGating?.enabled && nftGating.contractAddress
      ? nftGating.contractAddress
      : '0x0000000000000000000000000000000000000000') as Address,
    nftTokenId: nftGating?.enabled && nftGating.tokenId
      ? BigInt(nftGating.tokenId)
      : BigInt(0),
    isERC1155: nftGating?.isERC1155 || false,
    requireCoinbaseVerification: coinbaseVerification?.enabled || false,
  };
}
