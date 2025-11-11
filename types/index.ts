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
