// Revenue split calculation based on creator tier system
import { getCreator } from './creator-redis';
import { getEffectiveTier, getTierSplit } from './tier-calculator';

/**
 * Revenue split result for a transaction
 */
export interface RevenueSplit {
  creatorAmount: number; // Amount creator receives (in cents)
  platformAmount: number; // Amount platform receives (in cents)
  creatorWallet: string; // Creator's wallet address
  platformWallet: string; // Platform wallet address
  tier: 1 | 2 | 3 | 4; // Tier used for calculation
  creatorPercent: number; // Creator percentage (90, 85, 80, or 75)
  platformPercent: number; // Platform percentage (10, 15, 20, or 25)
}

/**
 * Calculate revenue split for a transaction based on creator's tier
 *
 * @param creatorId - Creator ID
 * @param totalAmount - Total transaction amount in cents
 * @returns Revenue split breakdown
 */
export async function calculateRevenueSplit(
  creatorId: string,
  totalAmount: number
): Promise<RevenueSplit> {
  // Get creator profile
  const creator = await getCreator(creatorId);
  if (!creator) {
    throw new Error(`Creator not found: ${creatorId}`);
  }

  // Determine effective tier (respects overrides)
  const tier = getEffectiveTier(creator);
  const { creatorPercent, platformPercent } = getTierSplit(tier);

  // Calculate split amounts (platform rounds, creator gets remainder)
  const platformAmount = Math.round(totalAmount * (platformPercent / 100));
  const creatorAmount = totalAmount - platformAmount;

  // Get platform wallet address
  const platformWallet = process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS ||
                         process.env.NEXT_PUBLIC_TIP_WALLET_ADDRESS ||
                         '';

  return {
    creatorAmount,
    platformAmount,
    creatorWallet: creator.walletAddress,
    platformWallet,
    tier,
    creatorPercent,
    platformPercent
  };
}

/**
 * Calculate revenue split for multiple creators (for grant distributions)
 *
 * @param splits - Array of {creatorId, amount} pairs
 * @returns Array of revenue splits
 */
export async function calculateBatchRevenueSplit(
  splits: Array<{ creatorId: string; amount: number }>
): Promise<RevenueSplit[]> {
  return Promise.all(
    splits.map(({ creatorId, amount }) =>
      calculateRevenueSplit(creatorId, amount)
    )
  );
}

/**
 * Calculate platform revenue from total transaction volume
 * Useful for analytics and reporting
 *
 * @param creatorId - Creator ID
 * @param totalVolume - Total transaction volume in cents
 * @returns Platform's share in cents
 */
export async function calculatePlatformRevenue(
  creatorId: string,
  totalVolume: number
): Promise<number> {
  const split = await calculateRevenueSplit(creatorId, totalVolume);
  return split.platformAmount;
}

/**
 * Get revenue split preview (without loading full creator profile)
 * Useful for UI displays
 *
 * @param tier - Tier level (1-4)
 * @param amount - Transaction amount in cents
 * @returns Split amounts
 */
export function previewRevenueSplit(
  tier: 1 | 2 | 3 | 4,
  amount: number
): { creatorAmount: number; platformAmount: number } {
  const { creatorPercent, platformPercent } = getTierSplit(tier);
  const platformAmount = Math.round(amount * (platformPercent / 100));
  const creatorAmount = amount - platformAmount;

  return { creatorAmount, platformAmount };
}
