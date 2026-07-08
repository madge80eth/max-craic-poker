import { describe, expect, it } from 'vitest';
import {
  applyBalancing,
  applyBreakingAndFinalTable,
  initSeatingState,
  SEATS_PER_TABLE,
  SeatingState,
  settleAfterHand,
} from './balancing';
import { mulberry32, hashSeed } from './rng';
import { createTournament, openRegistration, registerEntrant, startTournament, TournamentConfig } from './tournament';

function makeRunningTournament(n: number, seed: string) {
  const config: TournamentConfig = {
    minPlayers: 6,
    structure: { startingStack: 10000, levelMins: 8, lateRegLevels: 4, breaksEnabled: true, bbAnteFromLevel: 4 },
    payoutTemplate: 'top5',
    scheduledStartTime: Date.now(),
  };
  let t = createTournament(`t-${seed}`, config);
  t = (openRegistration(t) as { ok: true; state: typeof t }).state;
  for (let i = 0; i < n; i++) {
    t = (registerEntrant(t, `0x${i.toString(16).padStart(40, '0')}`) as { ok: true; state: typeof t }).state;
  }
  const started = startTournament(t, seed, Date.now());
  if (!started.ok) throw new Error(started.error);
  return started.state;
}

function occupied(state: SeatingState, tableNo: number): string[] {
  return Object.values(state.entrants)
    .filter((e) => e.status !== 'busted' && e.tableNo === tableNo)
    .map((e) => e.wallet);
}

function liveTables(state: SeatingState): number[] {
  return Object.values(state.tables)
    .filter((t) => !t.broken)
    .map((t) => t.tableNo);
}

function assertTableSizeInvariant(state: SeatingState) {
  const live = liveTables(state);
  if (live.length === 0) return;
  const sizes = live.map((t) => occupied(state, t).length);
  expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  for (const size of sizes) expect(size).toBeLessThanOrEqual(SEATS_PER_TABLE);
}

function assertNoSeatCollisions(state: SeatingState) {
  for (const tableNo of liveTables(state)) {
    const seats = Object.values(state.entrants)
      .filter((e) => e.status !== 'busted' && e.tableNo === tableNo)
      .map((e) => e.seat);
    expect(new Set(seats).size).toBe(seats.length);
  }
}

describe('applyBalancing', () => {
  it('moves exactly enough players to restore the size invariant', () => {
    const tournament = makeRunningTournament(11, 'balance-1'); // 2 tables: ceil(11/6)=2, base=5,rem=1 -> [6,5]
    let seating = initSeatingState(tournament);
    // Force an artificial imbalance: bust 3 players from the 6-seat table -> [3,5], diff=2.
    const liveTablesList = liveTables(seating);
    const bigTable = liveTablesList.find((t) => occupied(seating, t).length === 6)!;
    const bigTableWallets = occupied(seating, bigTable);
    seating = { ...seating, entrants: { ...seating.entrants } };
    for (const wallet of bigTableWallets.slice(0, 3)) {
      seating.entrants[wallet] = { ...seating.entrants[wallet], status: 'busted', tableNo: null, seat: null };
    }
    const before = liveTablesList.map((t) => occupied(seating, t).length);
    expect(Math.max(...before) - Math.min(...before)).toBeGreaterThanOrEqual(2);

    const { state: after, events } = applyBalancing(seating, Date.now());
    assertTableSizeInvariant(after);
    assertNoSeatCollisions(after);
    expect(events.length).toBeGreaterThan(0);
  });

  it('is a no-op when already balanced', () => {
    const tournament = makeRunningTournament(12, 'balance-2');
    const seating = initSeatingState(tournament);
    const { events } = applyBalancing(seating, Date.now());
    expect(events).toHaveLength(0);
  });
});

describe('applyBreakingAndFinalTable', () => {
  it('breaks the highest-numbered table once players thin out enough', () => {
    const tournament = makeRunningTournament(12, 'break-1'); // 2 tables of 6
    const seating = initSeatingState(tournament);
    const [t1, t2] = liveTables(seating).sort((a, b) => a - b);
    // Bust players down to 5 total (6*(2-1)=6, so <=6 triggers the break condition once we hit 6 or fewer).
    const allWallets = [...occupied(seating, t1), ...occupied(seating, t2)];
    for (const wallet of allWallets.slice(0, 6)) {
      seating.entrants[wallet] = { ...seating.entrants[wallet], status: 'busted', tableNo: null, seat: null };
    }
    expect(Object.values(seating.entrants).filter((e) => e.status !== 'busted')).toHaveLength(6);

    const { state: after } = applyBreakingAndFinalTable(seating, 'break-seed', Date.now());
    expect(liveTables(after)).toHaveLength(1);
    expect(after.finalTableReached).toBe(true);
    assertTableSizeInvariant(after);
    assertNoSeatCollisions(after);
  });

  it('does nothing when only one table exists', () => {
    const tournament = makeRunningTournament(6, 'break-2');
    const seating = initSeatingState(tournament);
    const { state: after, events } = applyBreakingAndFinalTable(seating, 'seed', Date.now());
    expect(events).toHaveLength(0);
    expect(after.finalTableReached).toBe(false);
  });
});

describe('10,000-tournament fuzz (MTT-SPEC §11 invariants for Phase 3)', () => {
  it(
    'never violates the table-size invariant, never duplicates a seat, and always terminates',
    () => {
    const ITERATIONS = 10_000;
    let maxStepsSeen = 0;

    for (let i = 0; i < ITERATIONS; i++) {
      const rand = mulberry32(hashSeed(`fuzz-${i}`));
      const n = 6 + Math.floor(rand() * 55); // 6..60
      const seed = `fuzz-tournament-${i}`;
      const tournament = makeRunningTournament(n, seed);
      let seating = initSeatingState(tournament);

      let steps = 0;
      const MAX_STEPS = 500;
      while (steps++ < MAX_STEPS) {
        const activeCount = Object.values(seating.entrants).filter((e) => e.status !== 'busted').length;
        if (activeCount <= 1) break;

        const live = liveTables(seating);
        // pick a deterministic-but-varied live table with >=2 occupied seats
        const eligible = live.filter((t) => occupied(seating, t).length >= 2);
        if (eligible.length === 0) break; // shouldn't happen given activeCount > 1, but guard anyway
        const tableNo = eligible[Math.floor(rand() * eligible.length)];
        const seated = occupied(seating, tableNo);

        // bust 1 random player at this table (simulating a hand completing with one elimination)
        const bustedWallet = seated[Math.floor(rand() * seated.length)];

        const result = settleAfterHand(seating, tableNo, [bustedWallet], `${seed}-step-${steps}`, Date.now());
        seating = result.state;

        assertTableSizeInvariant(seating);
        assertNoSeatCollisions(seating);
      }

      maxStepsSeen = Math.max(maxStepsSeen, steps);
      const finalActive = Object.values(seating.entrants).filter((e) => e.status !== 'busted').length;
      expect(finalActive).toBe(1); // every simulated tournament terminates down to 1 player
      expect(steps).toBeLessThan(MAX_STEPS); // terminated naturally, not via the safety cap
    }

    expect(maxStepsSeen).toBeLessThan(500);
    },
    120_000
  );
});
