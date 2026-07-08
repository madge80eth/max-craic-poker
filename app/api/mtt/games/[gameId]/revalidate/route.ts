import { NextResponse } from 'next/server';
import { defaultGateDeps } from '@/lib/mtt/gateDeps';
import { redisStore } from '@/lib/mtt/redisStore';
import { revalidateAtStart } from '@/lib/mtt/registration';

// T-0 re-check — GAME-CREATION-SPEC §4. Call this the moment a game starts,
// before seating, to catch flash-borrowed gate balances. P1/P2 will call this
// from the tournament start transition once the lifecycle exists.
export async function POST(_request: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;

  const game = await redisStore.getGame(gameId);
  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const summary = await revalidateAtStart(gameId, game.config.gates, defaultGateDeps, redisStore);

  return NextResponse.json({ success: true, summary });
}
