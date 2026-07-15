import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { initSeatingState } from '@/lib/mtt/balancing';
import { currentBlindLevel } from '@/lib/mtt/blinds';
import { defaultGateDeps } from '@/lib/mtt/gateDeps';
import { initAllTables } from '@/lib/mtt/multiTable';
import { initRanking } from '@/lib/mtt/ranking';
import { redisStore } from '@/lib/mtt/redisStore';
import { revalidateAtStart } from '@/lib/mtt/registration';
import { redisTablesStore } from '@/lib/mtt/tablesStore';
import { startTournament } from '@/lib/mtt/tournament';
import { redisTournamentStore } from '@/lib/mtt/tournamentStore';

// Game start — composes GAME-CREATION-SPEC §4 T-0 re-check with MTT-SPEC §4
// seeded draw. Order matters: gate-fail wallets must be dropped BEFORE the
// draw runs, or a flash-borrowed wallet could still get seated.
export async function POST(_request: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;

  const game = await redisStore.getGame(gameId);
  const tournament = await redisTournamentStore.get(gameId);
  if (!game || !tournament) {
    return NextResponse.json({ error: 'Game or tournament not found' }, { status: 404 });
  }

  const revalidation = await revalidateAtStart(gameId, game.config.gates, defaultGateDeps, redisStore);

  let liveTournament = tournament;
  if (revalidation.unregistered.length > 0) {
    const entrants = { ...liveTournament.entrants };
    for (const wallet of revalidation.unregistered) delete entrants[wallet];
    liveTournament = { ...liveTournament, entrants };
  }

  const seed = randomUUID();
  const result = startTournament(liveTournament, seed, Date.now());

  if (!result.ok) {
    await redisTournamentStore.set(gameId, liveTournament);
    return NextResponse.json({ success: false, error: result.error, revalidation }, { status: 400 });
  }

  // Populate the live-wiring fields (P3/P4 integration, HANDOFF.md §4a): seating
  // bookkeeping (TableMeta) and ranking state, derived fresh here rather than
  // inside tournament.ts to avoid a runtime import cycle with balancing.ts/ranking.ts.
  const seating = initSeatingState(result.state);
  const startedTournament = {
    ...result.state,
    tables: seating.tables,
    finalTableReached: false,
    ranking: initRanking(Object.keys(result.state.entrants).length),
  };
  await redisTournamentStore.set(gameId, startedTournament);

  const tables = initAllTables(startedTournament, currentBlindLevel(startedTournament));
  await redisTablesStore.setAllTables(gameId, tables);

  return NextResponse.json({ success: true, tournament: startedTournament, tableCount: Object.keys(tables).length, revalidation });
}
