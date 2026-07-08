// Multi-table hand loop — MTT-SPEC.md Phase 2. Orchestrates N independent
// copies of the existing single-table engine (via tableEngine.ts), all fed
// from the one global level clock (blinds.ts). Balancing/breaking tables as
// players bust is Phase 3 — this phase only starts hands and lets the
// existing engine run them.

import { GameState } from '@/lib/poker/types';
import { BlindLevel } from './blinds';
import { advanceTableHand, initTableFromDraw } from './tableEngine';
import { TableAssignment, TournamentState } from './tournament';

/** Reconstructs per-table seat assignments from entrant records (tableNo/seat). */
export function tableAssignmentsFrom(tournament: TournamentState): TableAssignment[] {
  const byTable = new Map<number, (string | null)[]>();
  for (const entrant of Object.values(tournament.entrants)) {
    if (entrant.tableNo === null || entrant.seat === null) continue;
    if (!byTable.has(entrant.tableNo)) byTable.set(entrant.tableNo, new Array(6).fill(null));
    byTable.get(entrant.tableNo)![entrant.seat] = entrant.wallet;
  }
  return Array.from(byTable.entries())
    .sort(([a], [b]) => a - b)
    .map(([tableNo, seats]) => ({ tableNo, seats }));
}

export function initAllTables(
  tournament: TournamentState,
  blindLevel: BlindLevel
): Record<number, GameState> {
  const assignments = tableAssignmentsFrom(tournament);
  const tables: Record<number, GameState> = {};
  for (const assignment of assignments) {
    tables[assignment.tableNo] = initTableFromDraw(
      `${tournament.tournamentId}:${assignment.tableNo}`,
      assignment,
      tournament.config.structure.startingStack,
      blindLevel
    );
  }
  return tables;
}

/** Deals the next hand at every table currently between hands; leaves live hands untouched. */
export function advanceAllTables(
  tables: Record<number, GameState>,
  blindLevel: BlindLevel
): Record<number, GameState> {
  const next: Record<number, GameState> = {};
  for (const [tableNo, state] of Object.entries(tables)) {
    next[Number(tableNo)] = state.phase === 'showdown' ? advanceTableHand(state, blindLevel) : state;
  }
  return next;
}
