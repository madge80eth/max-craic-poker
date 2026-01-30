import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { registerPlayer } from '@/lib/poker/tournament';

const redis = Redis.fromEnv();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params;
    const body = await request.json();
    const { playerId, playerName } = body;

    if (!playerId || !playerName) {
      return NextResponse.json({ error: 'Missing playerId or playerName' }, { status: 400 });
    }

    const result = await registerPlayer(redis, tournamentId, playerId, playerName);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error registering for tournament:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to register' },
      { status: 500 }
    );
  }
}
