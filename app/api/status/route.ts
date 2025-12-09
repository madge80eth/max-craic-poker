import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { checkAndResetSession, getTournamentsData } from '@/lib/session';

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
    let drawTimestamp = null;

    if (winnersData) {
      const parsed = typeof winnersData === 'string' ? JSON.parse(winnersData) : winnersData;
      winners = parsed.winners || null;
      drawTimestamp = parsed.timestamp || null; // Include draw timestamp for 12-hour window
    }

    // AUTO-DRAW: Check if we should auto-trigger draw (30 mins before stream, no winners yet)
    if (!winners && totalEntries >= 6) {
      try {
        const tournamentsData = await getTournamentsData();

        if (tournamentsData && tournamentsData.streamStartTime) {
          const streamStart = new Date(tournamentsData.streamStartTime).getTime();
          const now = Date.now();
          const thirtyMinsBefore = streamStart - (30 * 60 * 1000);

          // Auto-draw if: 30 mins before stream OR stream already started (within 12h window)
          const twelveHoursAfter = streamStart + (12 * 60 * 60 * 1000);
          const shouldAutoDraw = now >= thirtyMinsBefore && now <= twelveHoursAfter;

          if (shouldAutoDraw) {
            console.log('Auto-triggering draw...');
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://maxcraicpoker.com';
            const drawRes = await fetch(`${baseUrl}/api/draw`, { method: 'POST' });
            const drawData = await drawRes.json();
            if (drawData.success && drawData.winners) {
              winners = drawData.winners;
              console.log('Auto-draw successful!');
            }
          }
        }
      } catch (err) {
        console.error('Auto-draw check failed:', err);
      }
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
        winners,
        timestamp: drawTimestamp
      });
    }

    // Return general status
    return NextResponse.json({
      success: true,
      totalEntries,
      winners,
      timestamp: drawTimestamp
    });

  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get status', error: String(error) },
      { status: 500 }
    );
  }
}