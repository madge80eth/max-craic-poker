import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    // Get all entries
    const entries = await redis.hgetall('raffle_entries');
    
    if (!entries || Object.keys(entries).length === 0) {
      return NextResponse.json(
        { success: false, message: 'No entries found' },
        { status: 400 }
      );
    }

    // Convert entries to array and parse JSON strings
    const entryArray = Object.entries(entries).map(([address, data]) => {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return {
        walletAddress: address,
        ...parsed
      };
    });

    if (entryArray.length < 3) {
      return NextResponse.json(
        { success: false, message: `Need at least 3 entries for draw. Currently have ${entryArray.length}` },
        { status: 400 }
      );
    }

    // Shuffle array and pick first 3 as winners
    const shuffled = [...entryArray].sort(() => Math.random() - 0.5);
    const firstPlace = shuffled[0];
    const secondPlace = shuffled[1];
    const thirdPlace = shuffled[2];

    // Calculate profit shares
    const winners = [
      {
        place: 1,
        walletAddress: firstPlace.walletAddress,
        tournament: firstPlace.tournament,
        tournamentBuyIn: firstPlace.tournamentBuyIn,
        baseShare: 6,
        bonusShare: firstPlace.hasRecasted ? 6 : 0,
        totalShare: firstPlace.hasRecasted ? 12 : 6
      },
      {
        place: 2,
        walletAddress: secondPlace.walletAddress,
        tournament: secondPlace.tournament,
        tournamentBuyIn: secondPlace.tournamentBuyIn,
        baseShare: 5,
        bonusShare: secondPlace.hasRecasted ? 5 : 0,
        totalShare: secondPlace.hasRecasted ? 10 : 5
      },
      {
        place: 3,
        walletAddress: thirdPlace.walletAddress,
        tournament: thirdPlace.tournament,
        tournamentBuyIn: thirdPlace.tournamentBuyIn,
        baseShare: 4,
        bonusShare: thirdPlace.hasRecasted ? 4 : 0,
        totalShare: thirdPlace.hasRecasted ? 8 : 4
      }
    ];

    // Store winners
    await redis.set('raffle_winners', JSON.stringify({
      winners,
      drawnAt: new Date().toISOString(),
      totalEntries: entryArray.length
    }));

    return NextResponse.json({
      success: true,
      winners,
      totalEntries: entryArray.length,
      message: 'Winners drawn successfully!'
    });

  } catch (error) {
    console.error('Draw error:', error);
    return NextResponse.json(
      { success: false, message: 'Draw failed', error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const winnersData = await redis.get('raffle_winners');
    
    if (!winnersData) {
      return NextResponse.json(
        { success: false, message: 'No winners drawn yet' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...JSON.parse(winnersData as string)
    });

  } catch (error) {
    console.error('Get winners error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get winners' },
      { status: 500 }
    );
  }
}