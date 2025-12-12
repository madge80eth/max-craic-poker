// types/index.ts

export interface UserStats {
  walletAddress: string;
  totalEntries: number;
  tournamentsAssigned: number;
  lastThreeDrawIds: string[]; // Track last 3 draw IDs entered
  currentStreak: number; // Calculated: 3 consecutive = streak active
}

export interface Winner {
  walletAddress: string;
  position: 1 | 2 | 3 | 4 | 5 | 6;
  assignedTournament: string;
  basePercentage: number;
  sharingBonus: number; // 0 or 2
  streakMultiplier: number; // 1 or 1.5
  finalPercentage: number;
  tournamentResult: 'pending' | 'cashed' | 'busted';
  payout: number;
}

export interface DrawResult {
  drawId: string;
  timestamp: number;
  winners: Winner[];
}

// ============================================
// VIDEO/MEDIA TYPES
// ============================================

export type VideoCategory = 'highlight' | 'breakdown' | 'strategy';

export interface Video {
  id: string;
  title: string;
  description: string;
  cloudflareVideoId: string; // Cloudflare Stream video ID
  thumbnailUrl: string; // Cloudflare thumbnail
  duration: number; // seconds
  category: VideoCategory;
  uploadedAt: number; // timestamp
  viewCount: number;
  totalTips: number; // USDC cents (e.g., 1000 = $10.00)
  membersOnly?: boolean; // If true, requires active membership to view
  earlyAccessUntil?: number; // Timestamp - members get early access until this time
  isShort?: boolean; // If true, display as vertical 9:16 Short (TikTok/Reels style)
}

export interface VideoTip {
  videoId: string;
  tipper: string; // wallet address
  amount: number; // In token's smallest unit (e.g., USDC cents, wei for ETH)
  tokenAddress: string; // Contract address of token (0x0 for native ETH)
  tokenSymbol: string; // E.g., "USDC", "ETH", "DEGEN"
  usdValue?: number; // Converted USD value in cents
  timestamp: number;
  txHash?: string; // Base transaction hash
}

// ============================================
// MEMBERSHIP TYPES
// ============================================

export interface MembershipSettings {
  enabled: boolean;
  monthlyFeeUSDC: number; // In USDC cents (e.g., 1000 = $10.00)
  benefits: string[]; // List of benefit descriptions
  requireMembershipForRaffle: boolean; // Toggle: must be member to enter raffle
}

export interface Membership {
  walletAddress: string;
  startDate: number; // timestamp
  lastPaymentDate: number; // timestamp
  expiryDate: number; // timestamp (startDate + 30 days)
  status: 'active' | 'expired' | 'cancelled';
  totalPaid: number; // USDC cents
  txHashes: string[]; // Payment transaction hashes
}

// ============================================
// REVENUE TRACKING TYPES
// ============================================

export type TransactionType = 'tip' | 'membership' | 'raffle_distribution';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // In USDC cents for standardization
  tokenAddress?: string; // For tips
  tokenSymbol?: string; // For tips
  walletAddress: string; // Payer or recipient
  timestamp: number;
  txHash?: string;
  metadata?: {
    videoId?: string; // For tips
    videoTitle?: string; // For tips
    raffleId?: string; // For distributions
    position?: number; // For raffle winners
    monthlyFee?: number; // For memberships
    sessionId?: string; // For tips (track which session the tip was sent during)
  };
}

export interface RevenueStats {
  totalVolume: number; // Total USDC cents processed
  totalTips: number; // USDC cents
  totalMemberships: number; // USDC cents
  totalRaffleDistributions: number; // USDC cents
  platformCut: number; // USDC cents (2% of totalVolume)
  transactionCount: number;
  activeMemberships: number;
}
