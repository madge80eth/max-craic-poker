import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { readFileSync } from 'fs';
import { join } from 'path';

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

    // Load tournaments from filesystem
    const tournamentsPath = join(process.cwd(), 'public', 'tournaments.json');
    const tournamentsFile = readFileSync(tournamentsPath, 'utf-8');
    const tournamentsData = JSON.parse(tournamentsFile);
    const tournaments = tournamentsData.tournaments;

    if (!Array.isArray(tournaments) || tournaments.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No tournaments available'
      }, { status: 500 });
    }

    // Shuffle entries and pick first 3 as winners
    const shuffled = [...entryArray].sort(() => Math.random() - 0.5);
    
    const firstPlace = shuffled[0];
    const secondPlace = shuffled[1];
    const thirdPlace = shuffled[2];

    // Shuffle tournaments and assign UNIQUE ones to each winner
    const shuffledTournaments = [...tournaments].sort(() => Math.random() - 0.5);
    const firstTournament = shuffledTournaments[0];
    const secondTournament = shuffledTournaments[1];
    const thirdTournament = shuffledTournaments[2];

    // Create winners with flat profit shares (no bonuses)
    const winners = [
      {
        place: 1,
        walletAddress: firstPlace.walletAddress,
        tournament: firstTournament.name,
        tournamentBuyIn: firstTournament.buyIn,
        profitShare: 6
      },
      {
        place: 2,
        walletAddress: secondPlace.walletAddress,
        tournament: secondTournament.name,
        tournamentBuyIn: secondTournament.buyIn,
        profitShare: 5
      },
      {
        place: 3,
        walletAddress: thirdPlace.walletAddress,
        tournament: thirdTournament.name,
        tournamentBuyIn: thirdTournament.buyIn,
        profitShare: 4
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