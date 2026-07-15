// Post-hand settlement orchestrator — the live-wiring integration flagged as
// the single biggest remaining gap after the July 8 session (HANDOFF.md §4a):
// EntrantRecord.stack was only ever set once at startTournament and never
// synced from the real GameState.players[].chips as hands were played, so
// balancing/ranking had no accurate view of who had how many chips. This
// file is the adapter that closes that gap — it composes balancing.ts and
// ranking.ts (both unmodified) with the real per-table GameState, and
// rebuilds any table whose seat composition changed via tableEngine.ts's
// rebuildTableWithStacks (also unmodified engine.ts underneath).
//
// Call settleTableHand() once per hand that just ended (phase transitioned
// to 'showdown' or 'finished') at a table — see app/api/mtt/.../action/route.ts.

import { GameState } from '@/lib/poker/types';
import { BalancingEvent, SeatingState, settleAfterHand } from './balancing';
import { currentBlindLevel } from './blinds';
import { TablePhase, isBubble, tablesReadyToStart } from './bubble';
import { tableAssignmentsFrom } from './multiTable';
import { BustEvent, recordBusts, recordWinner } from './ranking';
import { rebuildTableWithStacks } from './tableEngine';
import { EntrantRecord, TournamentState } from './tournament';

export interface HandSettlementResult {
  tournament: TournamentState;
  /** Tables to persist: rebuilt tables (seat composition changed) plus the
   *  just-played table if balancing left it untouched. Does NOT include
   *  removedTables. */
  updatedTables: Record<number, GameState>;
  /** Tables broken this round — caller should stop polling / delete these. */
  removedTables: number[];
  events: BalancingEvent[];
  /** True if the tournament just reached lifecycle 'finished' (one entrant left). */
  finished: boolean;
}

export interface SettleTableHandParams {
  tournament: TournamentState;
  tableNo: number;
  /** The post-hand GameState for this table — phase must be 'showdown' or 'finished'. */
  tableState: GameState;
  seed: string;
  now: number;
  getRegisteredAt: (wallet: string) => Promise<number>;
}

export async function settleTableHand(params: SettleTableHandParams): Promise<HandSettlementResult> {
  const { tournament, tableNo, tableState, seed, now, getRegisteredAt } = params;

  // Snapshot each seated player's stack BEFORE syncing — this is their chip
  // count entering the hand that just finished, which is what ranking.ts's
  // tie-break needs ("larger stack that hand" — post-hand a buster is at 0).
  const preHandStacks: Record<string, number> = {};
  for (const p of tableState.players) {
    preHandStacks[p.odentity] = tournament.entrants[p.odentity]?.stack ?? p.chips;
  }

  let entrants: Record<string, EntrantRecord> = { ...tournament.entrants };
  for (const p of tableState.players) {
    const e = entrants[p.odentity];
    if (!e) continue;
    entrants[p.odentity] = { ...e, stack: p.chips };
  }

  const bustedWallets = tableState.players
    .filter((p) => p.chips === 0)
    .map((p) => p.odentity)
    .filter((w) => entrants[w]?.status === 'active');

  let ranking = tournament.ranking;
  if (bustedWallets.length > 0) {
    const bustEvents: BustEvent[] = [];
    for (const wallet of bustedWallets) {
      bustEvents.push({
        wallet,
        stackThatHand: preHandStacks[wallet] ?? 0,
        registeredAt: await getRegisteredAt(wallet),
      });
    }
    ranking = recordBusts(ranking, bustEvents);
  }

  const seatingIn: SeatingState = {
    entrants,
    tables: tournament.tables,
    finalTableReached: tournament.finalTableReached,
  };
  const { state: seatingOut, events } = settleAfterHand(seatingIn, tableNo, bustedWallets, seed, now);
  entrants = seatingOut.entrants;

  let tournamentOut: TournamentState = {
    ...tournament,
    entrants,
    tables: seatingOut.tables,
    finalTableReached: seatingOut.finalTableReached,
    ranking,
  };

  // Derive removedTables from the broken-flag diff rather than event parsing
  // alone: final_table_redraw breaks every non-final live table in one shot
  // but only emits a single event (no per-table table_break alongside it),
  // so enumerating brokenTable off individual events would miss them.
  const removedTables: number[] = [];
  for (const [tStr, meta] of Object.entries(seatingOut.tables)) {
    const t = Number(tStr);
    const wasBroken = tournament.tables[t]?.broken ?? false;
    if (meta.broken && !wasBroken) removedTables.push(t);
  }

  const touched = new Set<number>();
  for (const ev of events) {
    if (ev.type === 'move') {
      if (ev.fromTable !== undefined) touched.add(ev.fromTable);
      if (ev.toTable !== undefined) touched.add(ev.toTable);
    } else if (ev.type === 'final_table_redraw') {
      if (ev.toTable !== undefined) touched.add(ev.toTable);
    }
  }
  for (const t of removedTables) touched.delete(t);

  const blindLevel = currentBlindLevel(tournamentOut);
  const assignments = tableAssignmentsFrom(tournamentOut);
  const updatedTables: Record<number, GameState> = {};

  for (const t of touched) {
    const assignment = assignments.find((a) => a.tableNo === t);
    if (!assignment) continue;
    const stacks: Record<string, number> = {};
    for (const w of assignment.seats) if (w) stacks[w] = entrants[w]?.stack ?? 0;
    const rebuilt = rebuildTableWithStacks(`${tournamentOut.tournamentId}:${t}`, assignment, stacks, blindLevel);
    if (rebuilt) updatedTables[t] = rebuilt;
  }

  if (!touched.has(tableNo) && !removedTables.includes(tableNo)) {
    updatedTables[tableNo] = tableState;
  }

  let finished = false;
  const stillActive = Object.values(entrants).filter((e) => e.status === 'active');
  if (stillActive.length === 1 && tournamentOut.lifecycle === 'running') {
    ranking = recordWinner(ranking, stillActive[0].wallet);
    tournamentOut = { ...tournamentOut, lifecycle: 'finished', ranking };
    finished = true;
  }

  return { tournament: tournamentOut, updatedTables, removedTables, events, finished };
}

/** Per-table 'live'|'waiting'|'empty' phase, for the hand-for-hand bubble barrier (bubble.ts). */
export function computeTablePhases(tournament: TournamentState, tables: Record<number, GameState>): Record<number, TablePhase> {
  const phases: Record<number, TablePhase> = {};
  for (const [tableNoStr, meta] of Object.entries(tournament.tables)) {
    if (meta.broken) continue;
    const tableNo = Number(tableNoStr);
    const gs = tables[tableNo];
    phases[tableNo] = !gs ? 'empty' : gs.phase === 'showdown' ? 'waiting' : 'live';
  }
  return phases;
}

/** Whether `tableNo` may deal its next hand right now, respecting the hand-for-hand bubble barrier. */
export function isTableClearedToStart(
  tournament: TournamentState,
  tables: Record<number, GameState>,
  tableNo: number
): boolean {
  const activeCount = Object.values(tournament.entrants).filter((e) => e.status === 'active').length;
  const handForHand = isBubble(activeCount, tournament.payoutTable.length);
  const phases = computeTablePhases(tournament, tables);
  return tablesReadyToStart(phases, handForHand).includes(tableNo);
}
