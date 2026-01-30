import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createTournament, registerPlayer } from '@/lib/poker/tournament';

const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { creatorId, creatorName, name, maxPlayers, startingChips, blindIntervalMinutes, sybilResistance } = body;

    if (!creatorId || !creatorName) {
      return NextResponse.json({ error: 'Missing creatorId or creatorName' }, { status: 400 });
    }

    const tournament = await createTournament(redis, {
      name: name || `${creatorName}'s Tournament`,
      creatorId,
      maxPlayers: maxPlayers || 12,
      startingChips: startingChips || 1500,
      blindIntervalMinutes: blindIntervalMinutes || 3,
      sybilResistance,
    });

    // Auto-register the creator
    await registerPlayer(redis, tournament.tournamentId, creatorId, creatorName);

    return NextResponse.json({
      success: true,
      tournamentId: tournament.tournamentId,
      tournament,
    });
  } catch (error) {
    console.error('Error creating tournament:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create tournament' },
      { status: 500 }
    );
  }
}
