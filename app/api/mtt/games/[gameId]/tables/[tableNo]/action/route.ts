import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { processAction, toClientState } from '@/lib/poker/engine';
import { GameAction } from '@/lib/poker/types';
import { tickLevelClock } from '@/lib/mtt/blinds';
import { redisStore } from '@/lib/mtt/redisStore';
import { settleTableHand } from '@/lib/mtt/settlement';
import { redisTablesStore } from '@/lib/mtt/tablesStore';
import { redisTournamentStore } from '@/lib/mtt/tournamentStore';
import { Address } from '@/lib/mtt/types';

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
  let tournament = await redisTournamentStore.get(gameId);
  if (tournament) {
    const ticked = tickLevelClock(tournament, Date.now());
    if (ticked !== tournament) {
      tournament = ticked;
      await redisTournamentStore.set(gameId, tournament);
    }
  }

  let state = await redisTablesStore.getTable(gameId, Number(tableNo));
  if (!state) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  if (state.phase === 'waiting' || state.phase === 'finished' || state.phase === 'showdown') {
    return NextResponse.json({ error: 'Table not in progress' }, { status: 400 });
  }

  const phaseBefore = state.phase;

  try {
    const gameAction: GameAction = { type: action, amount, playerId: wallet };
    state = processAction(state, gameAction);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid action' }, { status: 400 });
  }

  const handJustEnded = phaseBefore !== state.phase && (state.phase === 'showdown' || state.phase === 'finished');

  if (!handJustEnded || !tournament) {
    await redisTablesStore.setTable(gameId, Number(tableNo), state);
    return NextResponse.json({ success: true, gameState: toClientState(state, wallet) });
  }

  // Hand just ended at this table — sync stacks into the tournament, record
  // any busts, run balancing/breaking, and rebuild any table whose seat
  // composition changed. This is the live-wiring integration (settlement.ts).
  const result = await settleTableHand({
    tournament,
    tableNo: Number(tableNo),
    tableState: state,
    seed: randomUUID(),
    now: Date.now(),
    getRegisteredAt: async (w) => {
      const record = await redisStore.getRegistration(gameId, w as Address);
      return record?.registeredAt ?? Date.now();
    },
  });

  await redisTournamentStore.set(gameId, result.tournament);
  for (const [t, gs] of Object.entries(result.updatedTables)) {
    await redisTablesStore.setTable(gameId, Number(t), gs);
  }
  for (const t of result.removedTables) {
    await redisTablesStore.deleteTable(gameId, t);
  }

  // This wallet's table may have changed (balancing move / table break /
  // final-table redraw) — tell the client so it can follow.
  const myNewTableNo = result.tournament.entrants[wallet.toLowerCase()]?.tableNo ?? null;
  const responseState = myNewTableNo !== null ? result.updatedTables[myNewTableNo] : undefined;

  return NextResponse.json({
    success: true,
    gameState: toClientState(responseState ?? state, wallet),
    movedToTable: myNewTableNo !== null && myNewTableNo !== Number(tableNo) ? myNewTableNo : undefined,
    tournamentFinished: result.finished,
    events: result.events,
  });
}
