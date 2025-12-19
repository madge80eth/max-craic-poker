// Creator context for multi-tenant architecture
// Default creator for existing single-tenant deployment

export const DEFAULT_CREATOR_ID = 'max-craic-poker';

export interface CreatorMetrics {
  volume90d: number; // 90-day rolling transaction volume in cents
  uniqueWallets90d: number; // Unique wallets that transacted
  transactionCount90d: number; // Total transactions in 90 days
  activeMonths: number; // Number of months with >0 transactions
}

export interface TierOverride {
  tier: 1 | 2 | 3 | 4;
  expiresAt: number; // Timestamp when override expires
  reason: 'founder' | 'grant' | 'promotion' | 'strategic_advisor';
}

export interface Creator {
  id: string; // Unique slug (e.g., 'max-craic-poker', 'weazel-poker')
  name: string; // Display name
  subdomain: string; // Subdomain slug (matches id)
  walletAddress: string; // Payout wallet for this creator

  // Tier system (replaces platformFeePercentage)
  tier: 1 | 2 | 3 | 4; // Current tier (1=90/10, 2=85/15, 3=80/20, 4=75/25)
  tierOverride?: TierOverride; // Manual override for founders, advisors
  isFounder: boolean; // First 5 creators + Jaylee = permanent founder badge
  metrics: CreatorMetrics; // 90-day performance metrics
  lastTierRecalculation: number; // Timestamp of last tier calc (quarterly)

  branding: {
    primaryColor?: string;
    logoUrl?: string;
    customDomain?: string;
  };
  features: {
    tippingEnabled: boolean;
    membershipEnabled: boolean;
    rafflesEnabled: boolean;
  };
  createdAt: number;
  isActive: boolean;
}

/**
 * Get creator-scoped Redis key
 * Migrates from old single-tenant keys to multi-tenant
 */
export function getCreatorKey(creatorId: string, key: string): string {
  return `creator:${creatorId}:${key}`;
}

/**
 * Helper to get creator from hostname
 * Examples:
 * - weazel.craicprotocol.com → 'weazel-poker'
 * - maxcraicpoker.com → 'max-craic-poker' (default)
 * - localhost → 'max-craic-poker' (default)
 */
export function getCreatorIdFromHostname(hostname: string): string {
  // Custom domain mapping
  if (hostname.includes('maxcraicpoker.com')) {
    return DEFAULT_CREATOR_ID;
  }

  // Subdomain detection
  const subdomainMatch = hostname.match(/^([^.]+)\.craicprotocol\.com$/);
  if (subdomainMatch) {
    return `${subdomainMatch[1]}-poker`;
  }

  // Default for localhost/unknown
  return DEFAULT_CREATOR_ID;
}

/**
 * Backwards compatibility: Get old key for migration
 */
export function getLegacyKey(key: string): string {
  // Old keys didn't have creator prefix
  return key;
}
