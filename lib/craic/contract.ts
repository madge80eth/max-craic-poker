// CraicHomeGame contract interaction helpers

import { createPublicClient, http, Address, parseAbi, encodeFunctionData } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { USDC_ADDRESS } from './types';

const isTestnet = process.env.NEXT_PUBLIC_TESTNET === 'true';
const chain = isTestnet ? baseSepolia : base;
const rpcUrl = isTestnet ? 'https://sepolia.base.org' : 'https://mainnet.base.org';

// ABI matching CraicHomeGame.sol
export const CRAIC_HOME_GAME_ABI = parseAbi([
  // Read
  'function getGame(bytes32 gameHash) view returns ((string gameId, address creator, address buyInToken, uint256 buyInAmount, uint16 protocolFeeBps, uint8 playerCount, uint8 status, uint256 createdAt, uint256 completedAt))',
  'function getPlayers(bytes32 gameHash) view returns (address[])',
  'function getGameTokens(bytes32 gameHash) view returns (address[])',
  'function getWinners(bytes32 gameHash) view returns (address[])',
  'function getPayoutAmount(bytes32 gameHash, address winner, address token) view returns (uint256)',
  'function hasJoined(bytes32 gameHash, address player) view returns (bool)',
  'function hasClaimed(bytes32 gameHash, address player) view returns (bool)',
  'function tokenBalance(bytes32 gameHash, address token) view returns (uint256)',
  'function signer() view returns (address)',
  'function owner() view returns (address)',
  'function protocolWallet() view returns (address)',
  'function MAX_FEE_BPS() view returns (uint16)',
  'function CLAIM_WINDOW() view returns (uint256)',

  // Write
  'function createGame(string gameId, address buyInToken, uint256 buyInAmount, uint16 protocolFeeBps) returns (bytes32)',
  'function join(bytes32 gameHash) payable',
  'function sponsor(bytes32 gameHash, address token, uint256 amount) payable',
  'function startGame(bytes32 gameHash)',
  'function completeGame(bytes32 gameHash, address[] winners, address[] tokens, uint256[][] amounts)',
  'function claim(bytes32 gameHash)',
  'function cancelGame(bytes32 gameHash, string reason)',
  'function refundUnclaimed(bytes32 gameHash)',

  // Events
  'event GameCreated(bytes32 indexed gameHash, string gameId, address indexed creator, address buyInToken, uint256 buyInAmount, uint16 protocolFeeBps)',
  'event PlayerJoined(bytes32 indexed gameHash, address indexed player, uint8 playerCount)',
  'event GameStarted(bytes32 indexed gameHash, uint8 playerCount)',
  'event GameCompleted(bytes32 indexed gameHash, uint256 completedAt)',
  'event PayoutClaimed(bytes32 indexed gameHash, address indexed winner, address indexed token, uint256 amount)',
  'event ProtocolFeeCollected(bytes32 indexed gameHash, address indexed token, uint256 amount)',
  'event GameCancelled(bytes32 indexed gameHash, string reason)',
  'event DepositRefunded(bytes32 indexed gameHash, address indexed depositor, address indexed token, uint256 amount)',
  'event SponsorDeposit(bytes32 indexed gameHash, address indexed sponsor, address indexed token, uint256 amount)',
  'event UnclaimedRefunded(bytes32 indexed gameHash, address indexed creator, uint256 tokenCount)',
]);

// ERC-20 ABI for token approval and balance checks
export const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
]);

// Contract addresses
export const CRAIC_CONTRACT_ADDRESS = (
  isTestnet
    ? process.env.NEXT_PUBLIC_CRAIC_CONTRACT_ADDRESS_SEPOLIA
    : process.env.NEXT_PUBLIC_CRAIC_CONTRACT_ADDRESS
) as Address || '0xD814F1f0c747B2434bF97dC81777e59882d86a67' as Address;

const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

// Game status enum (matches contract)
export enum GameStatus {
  Open = 0,
  Active = 1,
  Completed = 2,
  Cancelled = 3,
}

export async function getGame(gameHash: `0x${string}`) {
  try {
    return await publicClient.readContract({
      address: CRAIC_CONTRACT_ADDRESS,
      abi: CRAIC_HOME_GAME_ABI,
      functionName: 'getGame',
      args: [gameHash],
    });
  } catch (error) {
    console.error('Error getting game:', error);
    return null;
  }
}

export async function hasPlayerJoined(
  gameHash: `0x${string}`,
  playerAddress: Address
): Promise<boolean> {
  try {
    return await publicClient.readContract({
      address: CRAIC_CONTRACT_ADDRESS,
      abi: CRAIC_HOME_GAME_ABI,
      functionName: 'hasJoined',
      args: [gameHash, playerAddress],
    });
  } catch (error) {
    console.error('Error checking join status:', error);
    return false;
  }
}

export async function hasPlayerClaimed(
  gameHash: `0x${string}`,
  playerAddress: Address
): Promise<boolean> {
  try {
    return await publicClient.readContract({
      address: CRAIC_CONTRACT_ADDRESS,
      abi: CRAIC_HOME_GAME_ABI,
      functionName: 'hasClaimed',
      args: [gameHash, playerAddress],
    });
  } catch (error) {
    console.error('Error checking claim status:', error);
    return false;
  }
}

export async function getTokenStatus(tokenAddress: Address, walletAddress: Address): Promise<{
  balance: bigint;
  allowance: bigint;
}> {
  try {
    const [balance, allowance] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [walletAddress],
      }),
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [walletAddress, CRAIC_CONTRACT_ADDRESS],
      }),
    ]);
    return { balance, allowance };
  } catch (error) {
    console.error('Error getting token status:', error);
    return { balance: BigInt(0), allowance: BigInt(0) };
  }
}

export async function getBuyInTokenInfo(tokenAddress: Address): Promise<{
  symbol: string;
  decimals: number;
} | null> {
  try {
    const [symbol, decimals] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'symbol',
      }),
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals',
      }),
    ]);
    return { symbol, decimals };
  } catch (error) {
    console.error('Error getting buy-in token info:', error);
    return null;
  }
}

export async function getGameTokens(gameHash: `0x${string}`): Promise<readonly Address[]> {
  try {
    return await publicClient.readContract({
      address: CRAIC_CONTRACT_ADDRESS,
      abi: CRAIC_HOME_GAME_ABI,
      functionName: 'getGameTokens',
      args: [gameHash],
    });
  } catch (error) {
    console.error('Error getting game tokens:', error);
    return [];
  }
}

export async function getTokenBalanceOnChain(
  gameHash: `0x${string}`,
  token: Address
): Promise<bigint> {
  try {
    return await publicClient.readContract({
      address: CRAIC_CONTRACT_ADDRESS,
      abi: CRAIC_HOME_GAME_ABI,
      functionName: 'tokenBalance',
      args: [gameHash, token],
    });
  } catch (error) {
    console.error('Error getting token balance:', error);
    return BigInt(0);
  }
}

export function encodeCompleteGame(
  gameHash: `0x${string}`,
  winners: Address[],
  tokens: Address[],
  amounts: bigint[][]
): `0x${string}` {
  return encodeFunctionData({
    abi: CRAIC_HOME_GAME_ABI,
    functionName: 'completeGame',
    args: [gameHash, winners, tokens, amounts],
  });
}

export function encodeCreateGame(
  gameId: string,
  buyInToken: Address,
  buyInAmount: bigint,
  protocolFeeBps: number
): `0x${string}` {
  return encodeFunctionData({
    abi: CRAIC_HOME_GAME_ABI,
    functionName: 'createGame',
    args: [gameId, buyInToken, buyInAmount, protocolFeeBps],
  });
}

export function encodeJoin(gameHash: `0x${string}`): `0x${string}` {
  return encodeFunctionData({
    abi: CRAIC_HOME_GAME_ABI,
    functionName: 'join',
    args: [gameHash],
  });
}

export function encodeClaim(gameHash: `0x${string}`): `0x${string}` {
  return encodeFunctionData({
    abi: CRAIC_HOME_GAME_ABI,
    functionName: 'claim',
    args: [gameHash],
  });
}

export function encodeCancelGame(
  gameHash: `0x${string}`,
  reason: string
): `0x${string}` {
  return encodeFunctionData({
    abi: CRAIC_HOME_GAME_ABI,
    functionName: 'cancelGame',
    args: [gameHash, reason],
  });
}

export function encodeRefundUnclaimed(gameHash: `0x${string}`): `0x${string}` {
  return encodeFunctionData({
    abi: CRAIC_HOME_GAME_ABI,
    functionName: 'refundUnclaimed',
    args: [gameHash],
  });
}

export function encodeApproveToken(
  tokenAddress: Address,
  amount: bigint
): `0x${string}` {
  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [CRAIC_CONTRACT_ADDRESS, amount],
  });
}
