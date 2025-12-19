// Tier calculation logic for creator revenue splits
import { Creator, CreatorMetrics, TierOverride } from './creator-context';

/**
 * Tier system:
 * - Tier 1 (90/10): Founders OR $50K+ monthly volume
 * - Tier 2 (85/15): $20-50K monthly volume
 * - Tier 3 (80/20): $5-20K monthly volume
 * - Tier 4 (75/25): <$5K monthly volume
 *
 * Simple threshold-based calculation with anti-gaming checks:
 * - Volume threshold: 90-day average monthly volume
 * - Anti-gaming gates: Minimum unique wallets (10+), transactions (20+), active months (1+)
 */

// Tier thresholds in cents (monthly volume)
const TIER_THRESHOLDS = {
  1: 5000000, // $50K/month in cents
  2: 2000000, // $20K/month
  3: 500000,  // $5K/month
  4: 0        // <$5K/month
};

// Anti-gaming minimum requirements for tiers 1-3
const MINIMUM_UNIQUE_WALLETS = 10;
const MINIMUM_TRANSACTIONS = 20;
const MINIMUM_ACTIVE_MONTHS = 1;

/**
 * Calculate tier from creator metrics
 * Returns tier number (1-4) based on simple volume thresholds with anti-gaming checks
 */
export function calculateTier(metrics: CreatorMetrics): 1 | 2 | 3 | 4 {
  // Calculate monthly average volume from 90-day total
  const monthlyVolume = metrics.volume90d / 3;

  // Anti-gaming checks (required for tiers 1-3)
  const hasMinimumActivity =
    metrics.uniqueWallets90d >= MINIMUM_UNIQUE_WALLETS &&
    metrics.transactionCount90d >= MINIMUM_TRANSACTIONS &&
    metrics.activeMonths >= MINIMUM_ACTIVE_MONTHS;

  // Simple threshold-based tier calculation
  if (monthlyVolume >= TIER_THRESHOLDS[1] && hasMinimumActivity) {
    return 1; // Tier 1: $50K+/month
  }

  if (monthlyVolume >= TIER_THRESHOLDS[2] && hasMinimumActivity) {
    return 2; // Tier 2: $20-50K/month
  }

  if (monthlyVolume >= TIER_THRESHOLDS[3] && hasMinimumActivity) {
    return 3; // Tier 3: $5-20K/month
  }

  return 4; // Tier 4: <$5K/month (no minimum activity requirements)
}

/**
 * Check if tier should be recalculated (quarterly)
 * Returns true if >90 days since last calculation
 */
export function shouldRecalculateTier(lastRecalculation: number): boolean {
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
  const timeSinceLastCalc = Date.now() - lastRecalculation;
  return timeSinceLastCalc >= NINETY_DAYS_MS;
}

/**
 * Apply tier override if active
 * Returns effective tier (override if active, otherwise calculated tier)
 */
export function applyTierOverride(
  creator: Creator,
  calculatedTier: 1 | 2 | 3 | 4
): 1 | 2 | 3 | 4 {
  // Check if tierOverride exists and is not expired
  if (creator.tierOverride && Date.now() < creator.tierOverride.expiresAt) {
    console.log(`[Tier Override] ${creator.id}: Using override tier ${creator.tierOverride.tier} (reason: ${creator.tierOverride.reason})`);
    return creator.tierOverride.tier;
  }

  // Override expired or doesn't exist, use calculated tier
  return calculatedTier;
}

/**
 * Get effective tier for creator
 * Handles overrides, founder status, and calculation
 */
export function getEffectiveTier(creator: Creator): 1 | 2 | 3 | 4 {
  // Apply override first (founders, advisors, promotions)
  const calculated = calculateTier(creator.metrics);
  return applyTierOverride(creator, calculated);
}

/**
 * Determine if creator needs tier recalculation and update
 * Returns updated tier if recalc needed, otherwise current tier
 */
export function updateTierIfNeeded(creator: Creator): {
  needsUpdate: boolean;
  newTier: 1 | 2 | 3 | 4;
} {
  // Check if recalculation is due
  if (!shouldRecalculateTier(creator.lastTierRecalculation)) {
    return {
      needsUpdate: false,
      newTier: creator.tier
    };
  }

  // Recalculate tier
  const newTier = getEffectiveTier(creator);

  // Check if tier changed
  const needsUpdate = newTier !== creator.tier;

  return {
    needsUpdate,
    newTier
  };
}

/**
 * Create founder tier override (6 months, then performance-based)
 * For first 5 creators + Jaylee
 */
export function createFounderOverride(): TierOverride {
  const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
  return {
    tier: 1,
    expiresAt: Date.now() + SIX_MONTHS_MS,
    reason: 'founder'
  };
}

/**
 * Create strategic advisor override (permanent Tier 1)
 * For Jaylee specifically
 */
export function createStrategicAdvisorOverride(): TierOverride {
  const FAR_FUTURE = Date.now() + (100 * 365 * 24 * 60 * 60 * 1000); // 100 years
  return {
    tier: 1,
    expiresAt: FAR_FUTURE,
    reason: 'strategic_advisor'
  };
}

/**
 * Get tier revenue split percentages
 * Returns {creatorPercent, platformPercent}
 */
export function getTierSplit(tier: 1 | 2 | 3 | 4): {
  creatorPercent: number;
  platformPercent: number;
} {
  const splits = {
    1: { creatorPercent: 90, platformPercent: 10 },
    2: { creatorPercent: 85, platformPercent: 15 },
    3: { creatorPercent: 80, platformPercent: 20 },
    4: { creatorPercent: 75, platformPercent: 25 }
  };

  return splits[tier];
}
