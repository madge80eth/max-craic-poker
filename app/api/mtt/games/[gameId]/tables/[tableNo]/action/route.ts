import { NextResponse } from 'next/server';
import { processAction, toClientState } from '@/lib/poker/engine';
import { GameAction } from '@/lib/poker/types';
import { tickLevelClock } from '@/lib/mtt/blinds';
import { redisTablesStore } from '@/lib/mtt/tablesStore';
import { redisTournamentStore } from '@/lib/mtt/tournamentStore';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string; tableNo: string }> }
) {
  const { gameId, tableNo } = await params;
  const body = await request.json();
  const { wallet, action, amount } = body;

  if (!wallet || !action) {
    return NextResponse.json({ error: 'Missing wallet or action' }, { status: 400 });
  }

  // Every request is this architecture's clock tick — same pattern as the
  // existing single-table poll loop, just against the tournament-wide clock.
  const tournament = await redisTournamentStore.get(gameId);
  if (tournament) {
    const ticked = tickLevelClock(tournament, Date.now());
    if (ticked !== tournament) await redisTournamentStore.set(gameId, ticked);
  }

  let state = await redisTablesStore.getTable(gameId, Number(tableNo));
  if (!state) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  if (state.phase === 'waiting' || state.phase === 'finished' || state.phase === 'showdown') {
    return NextResponse.json({ error: 'Table not in progress' }, { status: 400 });
  }

  try {
    const gameAction: GameAction = { type: action, amount, playerId: wallet };
    state = processAction(state, gameAction);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid action' }, { status: 400 });
  }

  await redisTablesStore.setTable(gameId, Number(tableNo), state);

  return NextResponse.json({ success: true, gameState: toClientState(state, wallet) });
}
