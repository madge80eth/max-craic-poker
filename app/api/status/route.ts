import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { checkAndResetSession } from '@/lib/session';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(request: NextRequest) {
  try {
    // Auto-reset if session changed in tournaments.json
    await checkAndResetSession();

    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get('wallet');

    // Get total entries
    const entries = await redis.hgetall('raffle_entries');
    const totalEntries = entries ? Object.keys(entries).length : 0;

    // Get winners data
    const winnersData = await redis.get('raffle_winners');
    let winners = null;
    
    if (winnersData) {
      const parsed = typeof winnersData === 'string' ? JSON.parse(winnersData) : winnersData;
      winners = parsed.winners || null;
    }

    // Check if specific wallet requested
    if (walletAddress && entries) {
      const userEntryData = await redis.hget('raffle_entries', walletAddress);
      let userEntry = null;
      
      if (userEntryData) {
        userEntry = typeof userEntryData === 'string' ? JSON.parse(userEntryData) : userEntryData;
      }

      // Check if user is a winner
      let userWinnerInfo = null;
      if (winners && Array.isArray(winners)) {
        userWinnerInfo = winners.find((w: any) => 
          w.walletAddress.toLowerCase() === walletAddress.toLowerCase()
        );
      }

      return NextResponse.json({
        success: true,
        totalEntries,
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
      winners
    });

  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get status', error: String(error) },
      { status: 500 }
    );
  }
}