// Creator context for multi-tenant architecture
// Default creator for existing single-tenant deployment

export const DEFAULT_CREATOR_ID = 'max-craic-poker';

export interface Creator {
  id: string; // Unique slug (e.g., 'max-craic-poker', 'weazel-poker')
  name: string; // Display name
  subdomain: string; // Subdomain slug (matches id)
  walletAddress: string; // Payout wallet for this creator
  platformFeePercentage: number; // Usually 2%
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
