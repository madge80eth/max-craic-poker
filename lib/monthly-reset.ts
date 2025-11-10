import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Check if we need to do monthly reset and snapshot
 * Call this in any API that reads/writes entry_history
 */
export async function checkAndResetMonthly(): Promise<void> {
  try {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // "2025-11"

    // Get last processed month
    const lastMonth = await redis.get('last_processed_month');

    // If it's a new month and we haven't processed it yet
    if (lastMonth && lastMonth !== currentMonthKey) {
      console.log(`🔄 New month detected! Last: ${lastMonth}, Current: ${currentMonthKey}`);

      // 1. Snapshot the previous month's leaderboard
      await snapshotLeaderboard(lastMonth as string);

      // 2. Clear entry_history for fresh start
      await redis.del('entry_history');
      console.log('✅ Entry history cleared for new month');

      // 3. Update last processed month
      await redis.set('last_processed_month', currentMonthKey);
      console.log(`✅ Updated to current month: ${currentMonthKey}`);
    } else if (!lastMonth) {
      // First time setup
      await redis.set('last_processed_month', currentMonthKey);
      console.log(`📝 Initialized month tracking: ${currentMonthKey}`);
    }
  } catch (error) {
    console.error('Monthly reset check error:', error);
    // Don't throw - allow API to continue
  }
}

/**
 * Create snapshot of leaderboard for a specific month
 */
async function snapshotLeaderboard(monthKey: string): Promise<void> {
  try {
    // Get current leaderboard before clearing
    const historyData = await redis.hgetall('entry_history');

    if (!historyData || Object.keys(historyData).length === 0) {
      console.log('No leaderboard data to snapshot');
      return;
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

    const monthDate = new Date(`${monthKey}-01`);
    const monthName = monthDate.toLocaleString('en-GB', { month: 'long', year: 'numeric' });

    // Store snapshot
    const snapshot = {
      month: monthName,
      monthKey,
      snapshotDate: new Date().toISOString(),
      top3,
      totalParticipants: entries.length
    };

    await redis.set(`leaderboard_snapshot:${monthKey}`, JSON.stringify(snapshot));

    // Store list of all snapshot months
    const existingMonths = await redis.get('leaderboard_months');
    const months = existingMonths ? JSON.parse(existingMonths as string) : [];
    if (!months.includes(monthKey)) {
      months.push(monthKey);
      await redis.set('leaderboard_months', JSON.stringify(months));
    }

    console.log(`✅ Snapshot created for ${monthName}. Top 3:`, top3.map(w => ({
      rank: w.rank,
      wallet: w.walletAddress,
      entries: w.totalEntries
    })));
  } catch (error) {
    console.error('Snapshot creation error:', error);
  }
}
