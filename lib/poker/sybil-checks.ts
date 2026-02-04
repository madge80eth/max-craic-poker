// Sybil resistance verification checks for poker tables
// Reuses existing verification functions from lib/craic/sybil.ts

import { createPublicClient, http, Address, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { SybilResistanceConfig } from './types';
import { verifyCoinbaseAttestation, verifyNFTOwnership } from '../craic/sybil';

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
]);

interface CheckResult {
  passed: boolean;
  error?: string;
}

/**
 * Run all enabled sybil checks for a player attempting to join a table.
 * Returns { passed: true } if all checks pass, or { passed: false, errors: [...] } with
 * user-friendly error messages for each failed check.
 */
export async function checkAllSybilRequirements(
  walletAddress: string,
  config: SybilResistanceConfig
): Promise<{ passed: boolean; errors: string[] }> {
  const errors: string[] = [];
  const checks: Promise<void>[] = [];

  if (config.coinbaseVerification.enabled) {
    checks.push(
      checkCoinbaseVerification(walletAddress).then((r) => {
        if (!r.passed) errors.push(r.error || 'Coinbase verification required.');
      })
    );
  }

  if (config.addressWhitelist.enabled) {
    const result = checkAddressWhitelist(walletAddress, config.addressWhitelist.addresses);
    if (!result.passed) errors.push(result.error || 'Address not on whitelist.');
  }

  if (config.nftGating.enabled && config.nftGating.contractAddress) {
    checks.push(
      checkNFTGating(walletAddress, config.nftGating.contractAddress, config.nftGating.tokenId).then((r) => {
        if (!r.passed) errors.push(r.error || 'NFT ownership required.');
      })
    );
  }

  if (config.tokenGating.enabled && config.tokenGating.contractAddress && config.tokenGating.minAmount) {
    checks.push(
      checkTokenGating(walletAddress, config.tokenGating.contractAddress, config.tokenGating.minAmount).then((r) => {
        if (!r.passed) errors.push(r.error || 'Insufficient token balance.');
      })
    );
  }

  if (config.farcasterRequired.enabled) {
    checks.push(
      checkFarcasterFID(walletAddress).then((r) => {
        if (!r.passed) errors.push(r.error || 'Farcaster account required.');
      })
    );
  }

  if (config.baseNameRequired.enabled) {
    checks.push(
      checkBaseName(walletAddress).then((r) => {
        if (!r.passed) errors.push(r.error || 'Base name (.base.eth) required.');
      })
    );
  }

  await Promise.all(checks);

  return {
    passed: errors.length === 0,
    errors,
  };
}

/**
 * Coinbase Verification — checks EAS attestation on Base via onchainkit
 */
async function checkCoinbaseVerification(walletAddress: string): Promise<CheckResult> {
  try {
    const result = await verifyCoinbaseAttestation(walletAddress);
    if (result.verified) return { passed: true };
    return {
      passed: false,
      error: 'This table requires Coinbase verification. Please verify your account at coinbase.com first.',
    };
  } catch {
    return {
      passed: false,
      error: 'Failed to verify Coinbase attestation. Please try again.',
    };
  }
}

/**
 * Address Whitelist — simple case-insensitive address check
 */
function checkAddressWhitelist(walletAddress: string, whitelist: string[]): CheckResult {
  const normalized = walletAddress.toLowerCase();
  const found = whitelist.some((addr) => addr.toLowerCase() === normalized);
  if (found) return { passed: true };
  return {
    passed: false,
    error: 'This table is whitelist-only. Your address is not on the list.',
  };
}

/**
 * NFT Gating — checks ERC-721 ownership (or ERC-1155 with tokenId)
 */
async function checkNFTGating(
  walletAddress: string,
  contractAddress: string,
  tokenId?: string
): Promise<CheckResult> {
  try {
    const result = await verifyNFTOwnership(walletAddress, contractAddress, tokenId);
    if (result.verified) return { passed: true };
    return {
      passed: false,
      error: tokenId
        ? `This table requires NFT #${tokenId} from contract ${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}.`
        : `This table requires an NFT from collection ${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}.`,
    };
  } catch {
    return {
      passed: false,
      error: 'Failed to verify NFT ownership. Please try again.',
    };
  }
}

/**
 * Token Gating — checks ERC-20 balance meets minimum
 */
async function checkTokenGating(
  walletAddress: string,
  contractAddress: string,
  minAmount: string
): Promise<CheckResult> {
  try {
    const balance = await publicClient.readContract({
      address: contractAddress as Address,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [walletAddress as Address],
    });

    const required = BigInt(minAmount);
    if (balance >= required) return { passed: true };

    return {
      passed: false,
      error: `This table requires a minimum token balance of ${minAmount}. Your current balance is insufficient.`,
    };
  } catch {
    return {
      passed: false,
      error: 'Failed to check token balance. Please try again.',
    };
  }
}

/**
 * Farcaster FID — placeholder check.
 * In production, verify the address has an associated Farcaster FID via hub or API.
 * For now, we check if the playerId looks like a wallet address (not a guest).
 */
async function checkFarcasterFID(walletAddress: string): Promise<CheckResult> {
  // TODO: Integrate with Farcaster hub to verify FID ownership
  // For now, require a connected wallet (not a guest)
  if (walletAddress.startsWith('0x') && walletAddress.length === 42) {
    return { passed: true };
  }
  return {
    passed: false,
    error: 'This table requires a verified Farcaster account. Please connect with Farcaster.',
  };
}

/**
 * Base Name — checks if wallet has a .base.eth name via reverse resolution
 */
async function checkBaseName(walletAddress: string): Promise<CheckResult> {
  try {
    // Use Base ENS reverse resolution
    const name = await publicClient.getEnsName({
      address: walletAddress as Address,
      universalResolverAddress: '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD', // Base ENS universal resolver
    });

    if (name && name.endsWith('.base.eth')) {
      return { passed: true };
    }

    return {
      passed: false,
      error: 'This table requires a .base.eth name. Get yours at base.org/names.',
    };
  } catch {
    return {
      passed: false,
      error: 'Failed to check Base name. Please try again.',
    };
  }
}
