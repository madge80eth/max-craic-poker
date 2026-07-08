import { describe, expect, it } from 'vitest';
import { processAction } from '@/lib/poker/engine';
import { GameState } from '@/lib/poker/types';
import { blindLevelFor } from './blinds';
import { advanceAllTables, initAllTables, tableAssignmentsFrom } from './multiTable';
import { createTournament, openRegistration, registerEntrant, startTournament, TournamentConfig } from './tournament';

function foldToShowdown(state: GameState): GameState {
  let s = state;
  let guard = 0;
  while (s.phase !== 'showdown' && s.phase !== 'finished' && guard < 100) {
    guard++;
    const player = s.players[s.activePlayerIndex];
    s = processAction(s, { type: 'fold', playerId: player.odentity });
  }
  return s;
}

function make12PlayerRunningTournament() {
  const config: TournamentConfig = {
    minPlayers: 6,
    structure: { startingStack: 10000, levelMins: 8, lateRegLevels: 4, breaksEnabled: true, bbAnteFromLevel: 4 },
    payoutTemplate: 'top3',
    scheduledStartTime: Date.now(),
  };
  let t = createTournament('t-multi', config);
  t = (openRegistration(t) as { ok: true; state: typeof t }).state;
  for (let i = 0; i < 12; i++) {
    t = (registerEntrant(t, `0x${i.toString(16).padStart(40, '0')}`) as { ok: true; state: typeof t }).state;
  }
  const started = startTournament(t, 'multi-seed', Date.now());
  if (!started.ok) throw new Error(started.error);
  return started.state;
}

describe('tableAssignmentsFrom', () => {
  it('reconstructs 2 tables of 6 from a 12-player draw, matching entrant records exactly', () => {
    const tournament = make12PlayerRunningTournament();
    const assignments = tableAssignmentsFrom(tournament);

    expect(assignments).toHaveLength(2);
    for (const assignment of assignments) {
      const seated = assignment.seats.filter((s): s is string => s !== null);
      expect(seated).toHaveLength(6);
      seated.forEach((wallet) => {
        const entrant = tournament.entrants[wallet];
        const rawIndex = assignment.seats.indexOf(wallet);
        expect(entrant.seat).toBe(rawIndex);
        expect(entrant.tableNo).toBe(assignment.tableNo);
      });
    }
  });
});

describe('initAllTables + advanceAllTables', () => {
  it('creates one live GameState per table, correctly seated', () => {
    const tournament = make12PlayerRunningTournament();
    const level1 = blindLevelFor(1, 4);
    const tables = initAllTables(tournament, level1);

    expect(Object.keys(tables)).toHaveLength(2);
    for (const state of Object.values(tables)) {
      expect(state.players).toHaveLength(6);
      expect(state.phase).toBe('preflop');
    }
  });

  it('only advances tables at showdown, leaving live hands at other tables untouched', () => {
    const tournament = make12PlayerRunningTournament();
    const level1 = blindLevelFor(1, 4);
    let tables = initAllTables(tournament, level1);

    // Drive table 1 to showdown; leave table 2 mid-hand.
    tables = { ...tables, 1: foldToShowdown(tables[1]) };
    expect(tables[1].phase).toBe('showdown');
    expect(tables[2].phase).toBe('preflop');

    const table2Before = tables[2];
    const level2 = blindLevelFor(2, 4);
    const advanced = advanceAllTables(tables, level2);

    expect(advanced[1].phase).toBe('preflop');
    expect(advanced[1].config.blindLevels[0].smallBlind).toBe(75); // level 2 blinds applied
    expect(advanced[1].handNumber).toBe(tables[1].handNumber + 1);

    // Untouched table keeps its original (level 1) config and identical state.
    expect(advanced[2]).toEqual(table2Before);
  });
});
