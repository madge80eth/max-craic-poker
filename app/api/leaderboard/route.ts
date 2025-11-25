import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { checkAndResetMonthly } from '@/lib/monthly-reset';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface EntryHistory {
  totalEntries: number;
  lastEntry: string;
  firstEntry: string;
  sessions: string[];
}

interface LeaderboardEntry {
  walletAddress: string;
  totalEntries: number;
  lastEntry: string;
  rank: number;
}

export async function GET(request: NextRequest) {
  try {
    // Auto-check and reset monthly leaderboard if new month
    await checkAndResetMonthly();

    const { searchParams } = new URL(request.url);
    const userWallet = searchParams.get('wallet');

    // Single Redis read - efficient
    const historyData = await redis.hgetall('entry_history');

    if (!historyData || Object.keys(historyData).length === 0) {
      return NextResponse.json({
        success: true,
        leaderboard: [],
        userRank: null,
        totalParticipants: 0
      });
    }

    // Parse and sort entries
    const entries: LeaderboardEntry[] = Object.entries(historyData).map(([wallet, data]) => {
      const parsed: EntryHistory = typeof data === 'string' ? JSON.parse(data) : data;
      return {
        walletAddress: wallet,
        totalEntries: parsed.totalEntries,
        lastEntry: parsed.lastEntry,
        rank: 0 // Will be set after sorting
      };
    });

    // Sort by totalEntries DESC
    entries.sort((a, b) => b.totalEntries - a.totalEntries);

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Get top 20
    const top20 = entries.slice(0, 20);

    // Calculate total draws across all entries
    const totalDraws = entries.reduce((sum, entry) => sum + entry.totalEntries, 0);

    // Find user's rank if wallet provided
    let userRank = null;
    if (userWallet) {
      const userEntry = entries.find(e => e.walletAddress.toLowerCase() === userWallet.toLowerCase());
      if (userEntry) {
        userRank = {
          rank: userEntry.rank,
          totalEntries: userEntry.totalEntries,
          isInTop20: userEntry.rank <= 20
        };
      }
    }

    return NextResponse.json({
      success: true,
      leaderboard: top20,
      userRank,
      totalParticipants: entries.length,
      totalDraws
    });

  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch leaderboard',
      error: String(error)
    }, { status: 500 });
  }
}
