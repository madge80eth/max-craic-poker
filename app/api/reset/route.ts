import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getTodayPlayers, clearUserDailyData, clearTodayDailyHands } from '@/lib/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    // Clear current session data only
    await redis.del('raffle_entries');  // Current draw pool
    await redis.del('raffle_winners');  // Last session winners

    // Get all players who played today before clearing
    const todayPlayers = await getTodayPlayers();

    // Clear today's daily hands sorted set
    await clearTodayDailyHands();

    // Clear each player's daily hand and tickets
    for (const wallet of todayPlayers) {
      await clearUserDailyData(wallet);
    }

    console.log(`🔄 Reset complete. Cleared data for ${todayPlayers.length} players.`);

    // IMPORTANT: entry_history is NEVER cleared
    // This key tracks all-time participation stats for leaderboard
    // Only manual database maintenance should touch this

    return NextResponse.json({
      success: true,
      message: 'Session reset successfully. Ready for new raffle session.',
      cleared: ['raffle_entries', 'raffle_winners', 'daily hands sorted set'],
      playersCleared: todayPlayers,
      playersCount: todayPlayers.length,
      preserved: ['entry_history']
    });

  } catch (error) {
    console.error('Reset error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: String(error)
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return current system status
    const entries = await redis.hgetall('raffle_entries');
    const winnersData = await redis.get('raffle_winners');

    const totalEntries = entries ? Object.keys(entries).length : 0;

    let winners = null;
    if (winnersData) {
      const parsed = typeof winnersData === 'string' ? JSON.parse(winnersData) : winnersData;
      winners = parsed.winners || null;
    }

    return NextResponse.json({
      success: true,
      totalEntries,
      hasWinners: !!winners,
      winnersCount: winners ? winners.length : 0
    });

  } catch (error) {
    console.error('Get reset status error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: String(error)
    }, { status: 500 });
  }
}