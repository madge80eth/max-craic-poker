import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { readFileSync } from 'fs';
import { join } from 'path';
import { checkAndResetSession } from '@/lib/session';
import { getUserStats, incrementTournamentsAssigned } from '@/lib/redis';
import { Winner, DrawResult } from '@/types';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    // Auto-reset if session changed in tournaments.json
    await checkAndResetSession();

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

    if (entryArray.length < 6) {
      return NextResponse.json(
        { success: false, message: `Need at least 6 entries for draw. Currently have ${entryArray.length}` },
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

    // Shuffle entries and take first 6 unique winners
    const shuffled = [...entryArray].sort(() => Math.random() - 0.5);
    const uniqueWinners = Array.from(new Set(shuffled.map(e => e.walletAddress)))
      .slice(0, 6)
      .map(address => shuffled.find(e => e.walletAddress === address)!);

    // Prize structure
    const prizeStructure = [
      { position: 1 as const, basePercent: 6 },
      { position: 2 as const, basePercent: 5 },
      { position: 3 as const, basePercent: 4.5 },
      { position: 4 as const, basePercent: 4 },
      { position: 5 as const, basePercent: 3.5 },
      { position: 6 as const, basePercent: 3 }
    ];

    // Shuffle tournaments and assign one to each winner
    const shuffledTournaments = [...tournaments].sort(() => Math.random() - 0.5);

    // Create winner objects with bonuses
    const winners: Winner[] = await Promise.all(
      uniqueWinners.map(async (entry, idx) => {
        const stats = await getUserStats(entry.walletAddress);
        const hasShared = entry.hasShared || false;
        const hasStreak = stats.currentStreak === 3;

        const basePercent = prizeStructure[idx].basePercent;
        const sharingBonus = hasShared ? 2 : 0;
        const baseWithBonus = basePercent + sharingBonus;
        const streakMultiplier = hasStreak ? 1.5 : 1;
        const finalPercent = baseWithBonus * streakMultiplier;

        // Increment tournaments assigned
        await incrementTournamentsAssigned(entry.walletAddress);

        return {
          walletAddress: entry.walletAddress,
          position: prizeStructure[idx].position,
          assignedTournament: shuffledTournaments[idx]?.name || 'TBD',
          basePercentage: basePercent,
          sharingBonus,
          streakMultiplier,
          finalPercentage: finalPercent,
          tournamentResult: 'pending' as const,
          payout: 0
        };
      })
    );

    const drawResult: DrawResult = {
      drawId: `draw-${Date.now()}`,
      timestamp: Date.now(),
      winners
    };

    // Store draw result
    await redis.set('raffle_winners', JSON.stringify(drawResult));
    await redis.set('current_draw_result', JSON.stringify(drawResult));

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