// Membership gating middleware
import { getMembership } from './revenue-redis';

/**
 * Check if a wallet has an active membership
 */
export async function isActiveMember(walletAddress: string): Promise<boolean> {
  if (!walletAddress) return false;

  const membership = await getMembership(walletAddress.toLowerCase());

  if (!membership) return false;

  // Check if membership is active and not expired
  const isActive = membership.status === 'active' && membership.expiryDate > Date.now();

  return isActive;
}

/**
 * Get membership status with details
 */
export async function getMembershipStatus(walletAddress: string) {
  if (!walletAddress) {
    return {
      isMember: false,
      membership: null,
      daysRemaining: 0
    };
  }

  const membership = await getMembership(walletAddress.toLowerCase());

  if (!membership) {
    return {
      isMember: false,
      membership: null,
      daysRemaining: 0
    };
  }

  const isActive = membership.status === 'active' && membership.expiryDate > Date.now();
  const daysRemaining = Math.max(0, Math.ceil((membership.expiryDate - Date.now()) / (1000 * 60 * 60 * 24)));

  return {
    isMember: isActive,
    membership,
    daysRemaining
  };
}

/**
 * Middleware response for gated content
 */
export function membershipRequiredResponse() {
  return {
    error: 'Membership required',
    message: 'This content is exclusive to members. Subscribe in the Info tab to get access.',
    requiresMembership: true
  };
}
