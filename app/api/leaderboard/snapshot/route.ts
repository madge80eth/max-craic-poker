import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { getCurrentMonth } from '@/lib/nft';

// Admin key for taking snapshots (should be called at end of each month)
const ADMIN_KEY = process.env.ADMIN_RESET_KEY || 'h3j29fk18u';

interface EntryHistory {
  totalEntries: number;
  lastEntry: string;
  firstEntry: string;
  sessions: string[];
}

interface LeaderboardSnapshot {
  month: string;
  snapshotDate: string;
  topWallets: Array<{
    walletAddress: string;
    rank: number;
    totalEntries: number;
  }>;
}

/**
 * POST /api/leaderboard/snapshot
 * Takes a snapshot of the current top 5 leaderboard wallets
 * Should be called at the end of each month
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminKey, month } = body;

    // Verify admin key
    if (adminKey !== ADMIN_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use provided month or current month
    const snapshotMonth = month || getCurrentMonth();

    // Get all entry history
    const entryHistory = await redis.hgetall('entry_history');

    if (!entryHistory || Object.keys(entryHistory).length === 0) {
      return NextResponse.json(
        { error: 'No leaderboard data available' },
        { status: 404 }
      );
    }

    // Convert to array and sort by totalEntries
    const entries = Object.entries(entryHistory).map(([walletAddress, data]) => {
      const history = typeof data === 'string' ? JSON.parse(data) : data as EntryHistory;
      return {
        walletAddress,
        totalEntries: history.totalEntries,
      };
    });

    entries.sort((a, b) => b.totalEntries - a.totalEntries);

    // Get top 5 wallets
    const topWallets = entries.slice(0, 5).map((entry, index) => ({
      walletAddress: entry.walletAddress,
      rank: index + 1,
      totalEntries: entry.totalEntries,
    }));

    // Create snapshot
    const snapshot: LeaderboardSnapshot = {
      month: snapshotMonth,
      snapshotDate: new Date().toISOString(),
      topWallets,
    };

    // Store snapshot in Redis
    await redis.hset(`leaderboard_snapshot:${snapshotMonth}`, {
      month: snapshot.month,
      snapshotDate: snapshot.snapshotDate,
      topWallets: JSON.stringify(snapshot.topWallets)
    });

    // Also store in a list of all snapshots for easy retrieval
    const existingSnapshots = await redis.get('leaderboard_snapshots') as string[] || [];
    if (!existingSnapshots.includes(snapshotMonth)) {
      existingSnapshots.push(snapshotMonth);
      await redis.set('leaderboard_snapshots', existingSnapshots);
    }

    return NextResponse.json({
      success: true,
      snapshot,
      message: `Snapshot created for ${snapshotMonth}`,
    });
  } catch (error) {
    console.error('Error creating leaderboard snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to create snapshot' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/leaderboard/snapshot?month=2025-10
 * Get a specific month's snapshot
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');

    if (!month) {
      // Return all snapshots
      const snapshotMonths = await redis.get('leaderboard_snapshots') as string[] || [];
      const snapshots = await Promise.all(
        snapshotMonths.map(async (m) => {
          const snapshot = await redis.hgetall(`leaderboard_snapshot:${m}`);
          return snapshot;
        })
      );

      return NextResponse.json({
        success: true,
        snapshots,
      });
    }

    // Get specific month's snapshot
    const snapshot = await redis.hgetall(`leaderboard_snapshot:${month}`);

    if (!snapshot || Object.keys(snapshot).length === 0) {
      return NextResponse.json(
        { error: 'Snapshot not found for this month' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      snapshot,
    });
  } catch (error) {
    console.error('Error fetching snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to fetch snapshot' },
      { status: 500 }
    );
  }
}
