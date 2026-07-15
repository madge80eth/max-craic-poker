import { NextResponse } from 'next/server';
import { toClientState } from '@/lib/poker/engine';
import { currentBlindLevel, tickLevelClock } from '@/lib/mtt/blinds';
import { isTableClearedToStart } from '@/lib/mtt/settlement';
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

  // Hand-for-hand bubble (bubble.ts §6): once exactly one elimination stands
  // between the field and the money, every live table must park at 'waiting'
  // until ALL of them are there, then they all go together. Outside the
  // bubble this table-liveTableNos fetch is cheap (usually 1-3 tables).
  const liveTableNos = Object.values(tournament.tables)
    .filter((t) => !t.broken)
    .map((t) => t.tableNo);
  const allTables = await redisTablesStore.getAllTables(gameId, liveTableNos);
  allTables[Number(tableNo)] = state;

  if (!isTableClearedToStart(tournament, allTables, Number(tableNo))) {
    return NextResponse.json({ success: true, waiting: true, gameState: toClientState(state, wallet ?? null) });
  }

  const nextState = advanceTableHand(state, currentBlindLevel(tournament));
  await redisTablesStore.setTable(gameId, Number(tableNo), nextState);

  return NextResponse.json({ success: true, gameState: toClientState(nextState, wallet ?? null) });
}
