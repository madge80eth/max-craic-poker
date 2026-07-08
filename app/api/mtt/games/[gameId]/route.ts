import { NextResponse } from 'next/server';
import { redisStore } from '@/lib/mtt/redisStore';
import { redisTournamentStore } from '@/lib/mtt/tournamentStore';

// Lobby data — MTT-SPEC §10.1 lobby screen reads game config + tournament
// lifecycle/entrant count from this single call.
export async function GET(_request: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const record = await redisStore.getGame(gameId);
  if (!record) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }
  const tournament = await redisTournamentStore.get(gameId);
  return NextResponse.json({ success: true, record, tournament });
}
