// Sybil protection verification utilities

import { createPublicClient, http, Address, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { getAttestations } from '@coinbase/onchainkit/identity';
import { COINBASE_VERIFIED_SCHEMA_ID, USDC_ADDRESS } from './types';

// Public client for Base mainnet
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// ERC-721 ABI (balanceOf)
const ERC721_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
]);

// ERC-1155 ABI (balanceOf)
const ERC1155_ABI = parseAbi([
  'function balanceOf(address account, uint256 id) view returns (uint256)',
]);

// ERC-20 ABI (USDC)
const ERC20_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
]);

/**
 * Verify NFT ownership (ERC-721 or ERC-1155)
 */
export async function verifyNFTOwnership(
  walletAddress: string,
  contractAddress: string,
  tokenId?: string,
  isERC1155: boolean = false
): Promise<{ verified: boolean; balance: bigint; error?: string }> {
  try {
    const address = walletAddress as Address;
    const contract = contractAddress as Address;

    if (isERC1155 && tokenId) {
      // ERC-1155: Check specific token ID
      const balance = await publicClient.readContract({
        address: contract,
        abi: ERC1155_ABI,
        functionName: 'balanceOf',
        args: [address, BigInt(tokenId)],
      });

      return {
        verified: balance > BigInt(0),
        balance,
      };
    } else {
      // ERC-721: Check any token ownership
      const balance = await publicClient.readContract({
        address: contract,
        abi: ERC721_ABI,
        functionName: 'balanceOf',
        args: [address],
      });

      return {
        verified: balance > BigInt(0),
        balance,
      };
    }
  } catch (error) {
    console.error('NFT verification error:', error);
    return {
      verified: false,
      balance: BigInt(0),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verify Coinbase attestation via EAS on Base
 */
export async function verifyCoinbaseAttestation(
  walletAddress: string
): Promise<{ verified: boolean; attestations: any[]; error?: string }> {
  try {
    const attestations = await getAttestations(
      walletAddress as Address,
      base,
      { schemas: [COINBASE_VERIFIED_SCHEMA_ID] }
    );

    return {
      verified: attestations.length > 0,
      attestations,
    };
  } catch (error) {
    console.error('Coinbase verification error:', error);
    return {
      verified: false,
      attestations: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check USDC balance and allowance for bond
 */
export async function checkBondEligibility(
  walletAddress: string,
  bondAmount: bigint,
  spenderAddress: string
): Promise<{
  canBond: boolean;
  balance: bigint;
  allowance: bigint;
  needsApproval: boolean;
  error?: string;
}> {
  try {
    const address = walletAddress as Address;
    const spender = spenderAddress as Address;

    // Get USDC balance
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS as Address,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address],
    });

    // Get allowance for contract
    const allowance = await publicClient.readContract({
      address: USDC_ADDRESS as Address,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [address, spender],
    });

    const hasBalance = balance >= bondAmount;
    const hasAllowance = allowance >= bondAmount;

    return {
      canBond: hasBalance && hasAllowance,
      balance,
      allowance,
      needsApproval: hasBalance && !hasAllowance,
    };
  } catch (error) {
    console.error('Bond eligibility check error:', error);
    return {
      canBond: false,
      balance: BigInt(0),
      allowance: BigInt(0),
      needsApproval: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run all sybil checks for a player
 */
export async function verifySybilRequirements(
  walletAddress: string,
  options: {
    nftGating?: {
      enabled: boolean;
      contractAddress?: string;
      tokenId?: string;
      isERC1155?: boolean;
    };
    bondMechanic?: {
      enabled: boolean;
      amount?: number; // in cents
      contractAddress?: string; // game contract
    };
    coinbaseVerification?: {
      enabled: boolean;
    };
  }
): Promise<{
  passed: boolean;
  results: {
    nft?: { passed: boolean; balance: bigint; error?: string };
    bond?: { passed: boolean; balance: bigint; allowance: bigint; needsApproval: boolean; error?: string };
    coinbase?: { passed: boolean; error?: string };
  };
  failedChecks: string[];
}> {
  const results: any = {};
  const failedChecks: string[] = [];

  // NFT check
  if (options.nftGating?.enabled && options.nftGating.contractAddress) {
    const nftResult = await verifyNFTOwnership(
      walletAddress,
      options.nftGating.contractAddress,
      options.nftGating.tokenId,
      options.nftGating.isERC1155
    );
    results.nft = { passed: nftResult.verified, balance: nftResult.balance, error: nftResult.error };
    if (!nftResult.verified) {
      failedChecks.push('NFT ownership required');
    }
  }

  // Bond check
  if (options.bondMechanic?.enabled && options.bondMechanic.amount && options.bondMechanic.contractAddress) {
    // Convert cents to USDC (6 decimals)
    const bondAmountUsdc = BigInt(options.bondMechanic.amount) * BigInt(10000); // cents to 6 decimals
    const bondResult = await checkBondEligibility(
      walletAddress,
      bondAmountUsdc,
      options.bondMechanic.contractAddress
    );
    results.bond = {
      passed: bondResult.canBond,
      balance: bondResult.balance,
      allowance: bondResult.allowance,
      needsApproval: bondResult.needsApproval,
      error: bondResult.error,
    };
    if (!bondResult.canBond) {
      if (bondResult.needsApproval) {
        failedChecks.push('USDC approval required');
      } else {
        failedChecks.push('Insufficient USDC balance for bond');
      }
    }
  }

  // Coinbase verification
  if (options.coinbaseVerification?.enabled) {
    const coinbaseResult = await verifyCoinbaseAttestation(walletAddress);
    results.coinbase = { passed: coinbaseResult.verified, error: coinbaseResult.error };
    if (!coinbaseResult.verified) {
      failedChecks.push('Coinbase verification required');
    }
  }

  return {
    passed: failedChecks.length === 0,
    results,
    failedChecks,
  };
}
