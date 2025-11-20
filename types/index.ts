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
}

export interface VideoTip {
  videoId: string;
  tipper: string; // wallet address
  amount: number; // USDC cents
  timestamp: number;
  txHash?: string; // Base transaction hash
}
