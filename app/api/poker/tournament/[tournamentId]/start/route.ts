import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { startTournament } from '@/lib/poker/tournament';

const redis = Redis.fromEnv();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;
    const body = await request.json();
    const { playerId } = body;

    if (!playerId) {
      return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });
    }

    const result = await startTournament(redis, tournamentId, playerId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      tableIds: result.tableIds,
    });
  } catch (error) {
    console.error('Error starting tournament:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start tournament' },
      { status: 500 }
    );
  }
}
