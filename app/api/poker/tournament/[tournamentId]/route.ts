import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getTournamentState, getTournamentPlayers } from '@/lib/poker/tournament';

const redis = Redis.fromEnv();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;

    const tournament = await getTournamentState(redis, tournamentId);
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const players = await getTournamentPlayers(redis, tournamentId);

    return NextResponse.json({
      success: true,
      tournament,
      players,
    });
  } catch (error) {
    console.error('Error getting tournament:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get tournament' },
      { status: 500 }
    );
  }
}
