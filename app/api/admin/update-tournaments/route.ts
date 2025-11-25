import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getTodayPlayers, clearUserDailyData, clearTodayDailyHands } from '@/lib/redis';
import { saveTournamentsData, type TournamentsData } from '@/lib/session';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Received tournament update request');

    const body = await request.json();
    console.log('📦 Request body:', JSON.stringify(body, null, 2));

    const { sessionId, streamStartTime, tournaments } = body;

    // Validate required fields
    if (!sessionId || !streamStartTime || !tournaments || !Array.isArray(tournaments)) {
      console.error('❌ Validation failed: Missing required fields');
      return NextResponse.json(
        { success: false, message: 'Missing required fields: sessionId, streamStartTime, tournaments' },
        { status: 400 }
      );
    }

    // Validate tournaments array
    if (tournaments.length === 0 || tournaments.length > 10) {
      console.error('❌ Validation failed: Invalid tournament count:', tournaments.length);
      return NextResponse.json(
        { success: false, message: 'Tournaments must have 1-10 entries' },
        { status: 400 }
      );
    }

    // Validate each tournament has name and buyIn
    for (const tournament of tournaments) {
      if (!tournament.name || !tournament.buyIn) {
        console.error('❌ Validation failed: Tournament missing name or buyIn:', tournament);
        return NextResponse.json(
          { success: false, message: 'Each tournament must have name and buyIn' },
          { status: 400 }
        );
      }
    }

    console.log('✅ Validation passed');

    // Build the tournaments data
    const tournamentsData: TournamentsData = {
      sessionId,
      streamStartTime,
      tournaments: tournaments.filter((t: any) => t.name && t.name.trim() !== '')
    };

    console.log('📝 Saving tournaments data...');
    // Save to Redis (works in production) and file (local dev)
    await saveTournamentsData(tournamentsData);
    console.log('✅ Tournaments data saved successfully');

    console.log('🗑️ Clearing raffle entries and winners...');
    // Clear entries and start fresh draw (same as reset)
    await redis.del('raffle_entries');
    await redis.del('raffle_winners');
    console.log('✅ Raffle data cleared');

    console.log('🗑️ Clearing today\'s Madge game data...');
    // Clear today's Madge game data
    const todayPlayers = await getTodayPlayers();
    console.log(`📊 Found ${todayPlayers.length} players to clear`);

    await clearTodayDailyHands();
    console.log('✅ Daily hands cleared');

    for (const wallet of todayPlayers) {
      await clearUserDailyData(wallet);
    }
    console.log('✅ User daily data cleared');

    console.log(`🎯 Tournament update + reset complete. Cleared ${todayPlayers.length} players.`);

    return NextResponse.json({
      success: true,
      message: 'Tournaments updated and draw reset successfully',
      data: tournamentsData,
      cleared: {
        entries: true,
        winners: true,
        dailyHands: todayPlayers.length
      }
    });

  } catch (error) {
    console.error('❌ Update tournaments error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { success: false, message: 'Failed to update tournaments', error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { getTournamentsData } = await import('@/lib/session');
    const data = await getTournamentsData();

    if (!data) {
      return NextResponse.json(
        { success: false, message: 'No tournaments data found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to read tournaments', error: String(error) },
      { status: 500 }
    );
  }
}
