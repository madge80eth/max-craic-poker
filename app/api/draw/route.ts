import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import fs from 'fs';
import path from 'path';

interface Tournament {
  name: string;
  buyIn: string;
}

interface TournamentsData {
  streamStartTime: string;
  tournaments: Tournament[];
}

export async function POST(request: NextRequest) {
  try {
    // Check if winners already exist
    const existingWinners = await redis.get('winners');
    if (existingWinners) {
      return NextResponse.json({
        success: false,
        message: 'Winners already drawn for this session'
      });
    }

    // Get all entries
    const entries = await redis.hgetall('entries');
    
    if (!entries || Object.keys(entries).length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No entries to draw from'
      });
    }

    const entryArray = Object.values(entries).map((entry: any) => 
      typeof entry === 'string' ? JSON.parse(entry) : entry
    );

    if (entryArray.length < 3) {
      return NextResponse.json({
        success: false,
        message: `Need at least 3 entries. Currently have ${entryArray.length}`
      });
    }

    // Load tournaments
    const tournamentsPath = path.join(process.cwd(), 'public', 'tournaments.json');
    const tournamentsFile = fs.readFileSync(tournamentsPath, 'utf-8');
    const tournamentsData: TournamentsData = JSON.parse(tournamentsFile);
    const tournaments = tournamentsData.tournaments;

    if (tournaments.length < 3) {
      return NextResponse.json({
        success: false,
        message: 'Need at least 3 tournaments defined'
      });
    }

    // Shuffle entries and tournaments to ensure randomness
    const shuffledEntries = [...entryArray].sort(() => Math.random() - 0.5);
    const shuffledTournaments = [...tournaments].sort(() => Math.random() - 0.5);

    // Select 3 unique winners with 3 unique tournaments
    const profitShares = [6, 5, 4];
    const winners = shuffledEntries.slice(0, 3).map((entry, index) => ({
      place: index + 1,
      walletAddress: entry.walletAddress,
      tournament: shuffledTournaments[index].name,
      tournamentBuyIn: shuffledTournaments[index].buyIn,
      profitShare: profitShares[index]
    }));

    const drawData = {
      winners,
      drawnAt: new Date().toISOString(),
      totalEntries: entryArray.length,
      streamStartTime: tournamentsData.streamStartTime
    };

    // Store winners in Redis
    await redis.set('winners', JSON.stringify(drawData));

    return NextResponse.json({
      success: true,
      ...drawData
    });

  } catch (error) {
    console.error('Draw error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to draw winners'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const winners = await redis.get('winners');
    
    if (!winners) {
      return NextResponse.json({
        success: true,
        hasWinner: false,
        message: 'No winner drawn yet'
      });
    }

    const drawData = typeof winners === 'string' ? JSON.parse(winners) : winners;

    return NextResponse.json({
      success: true,
      hasWinner: true,
      ...drawData
    });

  } catch (error) {
    console.error('Get draw error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch draw data'
    }, { status: 500 });
  }
}