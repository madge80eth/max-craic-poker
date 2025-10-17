import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get('wallet');

    // Get total entries
    const entries = await redis.hgetall('raffle_entries');
    const totalEntries = entries ? Object.keys(entries).length : 0;

    // Get timer data
    const timerData = await redis.get('raffle_timer');
    const timer = timerData ? JSON.parse(timerData as string) : null;
    
    let timeRemaining = 0;
    if (timer?.endTime) {
      const now = Date.now();
      const end = new Date(timer.endTime).getTime();
      timeRemaining = Math.max(0, Math.floor((end - now) / 1000));
    }

    // Get winners data
    const winnersData = await redis.get('raffle_winners');
    const winners = winnersData ? JSON.parse(winnersData as string).winners : null;

    // Check if specific wallet requested
    if (walletAddress && entries) {
      const userEntryData = await redis.hget('raffle_entries', walletAddress);
      const userEntry = userEntryData ? JSON.parse(userEntryData as string) : null;

      // Check if user is a winner
      let userWinnerInfo = null;
      if (winners) {
        userWinnerInfo = winners.find((w: any) => 
          w.walletAddress.toLowerCase() === walletAddress.toLowerCase()
        );
      }

      return NextResponse.json({
        success: true,
        totalEntries,
        timeRemaining,
        hasEntered: !!userEntry,
        userEntry,
        isWinner: !!userWinnerInfo,
        winnerInfo: userWinnerInfo,
        winners
      });
    }

    // Return general status
    return NextResponse.json({
      success: true,
      totalEntries,
      timeRemaining,
      winners
    });

  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get status' },
      { status: 500 }
    );
  }
}