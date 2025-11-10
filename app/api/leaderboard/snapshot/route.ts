import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Take a snapshot of current leaderboard for the month
 * This should be called at the end of each month (manually or via cron)
 */
export async function POST(request: NextRequest) {
  try {
    // Get current month/year
    const now = new Date();
    const month = now.toLocaleString('en-GB', { month: 'long', year: 'numeric' }); // "November 2025"
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // "2025-11"

    // Get current leaderboard
    const historyData = await redis.hgetall('entry_history');

    if (!historyData || Object.keys(historyData).length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No leaderboard data to snapshot'
      }, { status: 400 });
    }

    // Parse and sort entries
    const entries = Object.entries(historyData).map(([wallet, data]) => {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return {
        walletAddress: wallet,
        totalEntries: parsed.totalEntries,
        lastEntry: parsed.lastEntry,
        rank: 0
      };
    });

    entries.sort((a, b) => b.totalEntries - a.totalEntries);
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Take top 3 for NFT eligibility
    const top3 = entries.slice(0, 3);

    // Store snapshot
    const snapshot = {
      month,
      monthKey,
      snapshotDate: now.toISOString(),
      top3,
      totalParticipants: entries.length
    };

    await redis.set(`leaderboard_snapshot:${monthKey}`, JSON.stringify(snapshot));

    // Store list of all snapshot months (for UI to show history)
    const existingMonths = await redis.get('leaderboard_months');
    const months = existingMonths ? JSON.parse(existingMonths as string) : [];
    if (!months.includes(monthKey)) {
      months.push(monthKey);
      await redis.set('leaderboard_months', JSON.stringify(months));
    }

    return NextResponse.json({
      success: true,
      message: `Leaderboard snapshot created for ${month}`,
      snapshot,
      top3Winners: top3.map(w => ({
        rank: w.rank,
        wallet: w.walletAddress,
        entries: w.totalEntries
      }))
    });

  } catch (error) {
    console.error('Snapshot error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create snapshot',
      error: String(error)
    }, { status: 500 });
  }
}

/**
 * Get snapshot for a specific month
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthKey = searchParams.get('month'); // e.g., "2025-11"

    if (!monthKey) {
      // Return list of available months
      const months = await redis.get('leaderboard_months');
      return NextResponse.json({
        success: true,
        months: months ? JSON.parse(months as string) : []
      });
    }

    // Get specific month snapshot
    const snapshotData = await redis.get(`leaderboard_snapshot:${monthKey}`);

    if (!snapshotData) {
      return NextResponse.json({
        success: false,
        message: 'No snapshot found for this month'
      }, { status: 404 });
    }

    const snapshot = typeof snapshotData === 'string' ? JSON.parse(snapshotData) : snapshotData;

    return NextResponse.json({
      success: true,
      snapshot
    });

  } catch (error) {
    console.error('Get snapshot error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to get snapshot'
    }, { status: 500 });
  }
}
