import { NextResponse } from 'next/server';
import { toClientState } from '@/lib/poker/engine';
import { currentBlindLevel, tickLevelClock } from '@/lib/mtt/blinds';
import { redisTablesStore } from '@/lib/mtt/tablesStore';
import { advanceTableHand } from '@/lib/mtt/tableEngine';
import { redisTournamentStore } from '@/lib/mtt/tournamentStore';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string; tableNo: string }> }
) {
  const { gameId, tableNo } = await params;
  const body = await request.json();
  const { wallet } = body;

  let tournament = await redisTournamentStore.get(gameId);
  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }
  const ticked = tickLevelClock(tournament, Date.now());
  if (ticked !== tournament) {
    tournament = ticked;
    await redisTournamentStore.set(gameId, tournament);
  }

  const state = await redisTablesStore.getTable(gameId, Number(tableNo));
  if (!state) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }
  if (state.phase !== 'showdown') {
    return NextResponse.json({ error: 'Can only start next hand after showdown' }, { status: 400 });
  }

  const nextState = advanceTableHand(state, currentBlindLevel(tournament));
  await redisTablesStore.setTable(gameId, Number(tableNo), nextState);

  return NextResponse.json({ success: true, gameState: toClientState(nextState, wallet ?? null) });
}
