import { describe, expect, it } from 'vitest';
import { processAction } from '@/lib/poker/engine';
import { GameState } from '@/lib/poker/types';
import { initSeatingState } from './balancing';
import { currentBlindLevel } from './blinds';
import { initAllTables } from './multiTable';
import { initRanking } from './ranking';
import { computeTablePhases, isTableClearedToStart, settleTableHand } from './settlement';
import { advanceTableHand, initTableFromDraw } from './tableEngine';
import {
  createTournament,
  EntrantRecord,
  openRegistration,
  registerEntrant,
  startTournament,
  suggestedPayoutTemplateFor,
  TournamentConfig,
  TournamentState,
} from './tournament';

// ── fixtures ───────────────────────────────────────────────────────────

/** Mirrors app/api/mtt/games/[gameId]/start/route.ts's post-start augmentation. */
function makeStartedTournament(n: number, seed: string): TournamentState {
  const config: TournamentConfig = {
    minPlayers: 2,
    structure: { startingStack: 10000, levelMins: 10, lateRegLevels: 0, breaksEnabled: false, bbAnteFromLevel: 4 },
    payoutTemplate: suggestedPayoutTemplateFor(n),
    scheduledStartTime: Date.now(),
  };
  let t = createTournament(`t-${seed}`, config);
  t = (openRegistration(t) as { ok: true; state: typeof t }).state;
  for (let i = 0; i < n; i++) {
    t = (registerEntrant(t, `0x${seed}${i.toString(16).padStart(38, '0')}`) as { ok: true; state: typeof t }).state;
  }
  const started = startTournament(t, seed, Date.now());
  if (!started.ok) throw new Error(started.error);
  const seating = initSeatingState(started.state);
  return { ...started.state, tables: seating.tables, finalTableReached: false, ranking: initRanking(n) };
}

/** True chips currently in play at these tables — players' chip stacks PLUS
 *  whatever's mid-hand in each table's pot (blinds/antes posted but not yet
 *  awarded). This, not entrant.stack, is the ground-truth conservation
 *  invariant: entrant.stack is only as fresh as the last hand THAT table
 *  finished, so it can lag behind a live table's pot by up to one hand's
 *  blinds — expected eventual consistency, not a leak. */
function sumChips(tables: Record<number, GameState>): number {
  return Object.values(tables).reduce((sum, t) => sum + t.pot + t.players.reduce((s, p) => s + p.chips, 0), 0);
}

function sumEntrantStacks(entrants: Record<string, EntrantRecord>): number {
  return Object.values(entrants).reduce((sum, e) => sum + e.stack, 0);
}

/** Fabricates a "hand just ended" GameState by awarding busted players' chips
 *  (plus whatever was already in the pot) to a winner within the same table —
 *  conserves total chips exactly, same as a real showdown would, without
 *  depending on real card outcomes. Used for unit tests that need a specific,
 *  deterministic bust pattern; the fuzz test below drives real hands through
 *  the real engine instead. */
function bustPlayers(tableState: GameState, victimWallets: string[], winnerWallet: string): GameState {
  const victimsChips = tableState.players.filter((p) => victimWallets.includes(p.odentity)).reduce((s, p) => s + p.chips, 0);
  const awarded = victimsChips + tableState.pot;
  return {
    ...tableState,
    phase: 'showdown',
    pot: 0,
    players: tableState.players.map((p) => {
      if (victimWallets.includes(p.odentity)) return { ...p, chips: 0, folded: true };
      if (p.odentity === winnerWallet) return { ...p, chips: p.chips + awarded };
      return p;
    }),
  };
}

const getRegisteredAtStub = async () => Date.now();

// ── unit tests ─────────────────────────────────────────────────────────

describe('settleTableHand', () => {
  it('syncs stacks and finishes the tournament on a heads-up bust', async () => {
    const tournament = makeStartedTournament(2, 'hu1');
    const tables = initAllTables(tournament, currentBlindLevel(tournament));
    const [tableNo] = Object.keys(tables).map(Number);
    const base = tables[tableNo];
    const [a, b] = base.players;
    const total = a.chips + b.chips + base.pot;

    const played = bustPlayers(base, [a.odentity], b.odentity);
    const result = await settleTableHand({
      tournament,
      tableNo,
      tableState: played,
      seed: 'seed-hu1',
      now: Date.now(),
      getRegisteredAt: getRegisteredAtStub,
    });

    expect(result.finished).toBe(true);
    expect(result.tournament.lifecycle).toBe('finished');
    expect(result.tournament.entrants[a.odentity].status).toBe('busted');
    expect(result.tournament.entrants[a.odentity].stack).toBe(0);
    expect(result.tournament.entrants[b.odentity].stack).toBe(total);

    const order = result.tournament.ranking.finishOrder;
    expect(order).toHaveLength(2);
    expect(order.find((f) => f.wallet === b.odentity)?.finishPos).toBe(1);
    expect(order.find((f) => f.wallet === a.odentity)?.finishPos).toBe(2);
  });

  it('rebuilds both tables touched by a balancing move and conserves chips', async () => {
    const tournament = makeStartedTournament(12, 'bal1'); // ceil(12/6)=2 tables of 6
    const tables = initAllTables(tournament, currentBlindLevel(tournament));
    const [tableA, tableB] = Object.keys(tables).map(Number);
    const base = tables[tableA];
    const [v1, v2, winner] = base.players;
    const totalBefore = sumChips(tables);

    // Busting 2 of 6 at table A (4 left) against table B's 6 forces a diff of
    // 2 — applyBalancing must move exactly one player B->A to restore [5,5].
    const played = bustPlayers(base, [v1.odentity, v2.odentity], winner.odentity);
    const result = await settleTableHand({
      tournament,
      tableNo: tableA,
      tableState: played,
      seed: 'seed-bal1',
      now: Date.now(),
      getRegisteredAt: getRegisteredAtStub,
    });

    expect(result.events.some((e) => e.type === 'move')).toBe(true);
    expect(result.removedTables).toHaveLength(0);
    expect(result.updatedTables[tableA]).toBeDefined();
    expect(result.updatedTables[tableB]).toBeDefined();
    expect(result.updatedTables[tableA].players).toHaveLength(5);
    expect(result.updatedTables[tableB].players).toHaveLength(5);

    // Every rebuilt table's roster must match the tournament's own seat assignments.
    for (const tableNo of [tableA, tableB]) {
      const rosterFromEntrants = Object.values(result.tournament.entrants)
        .filter((e) => e.tableNo === tableNo)
        .map((e) => e.wallet)
        .sort();
      const rosterFromTable = result.updatedTables[tableNo].players.map((p) => p.odentity).sort();
      expect(rosterFromTable).toEqual(rosterFromEntrants);
    }

    expect(sumChips(result.updatedTables)).toBe(totalBefore);
  });

  it('breaks the highest-numbered table and redistributes its players, conserving chips', async () => {
    const tournament = makeStartedTournament(17, 'break1'); // 3 tables: [6,6,5]
    const tables = initAllTables(tournament, currentBlindLevel(tournament));
    const tableNos = Object.keys(tables).map(Number).sort((a, b) => a - b);
    const sixSeatTable = tableNos.find((t) => tables[t].players.length === 6)!;
    const base = tables[sixSeatTable];
    const victims = base.players.slice(0, 5).map((p) => p.odentity);
    const winner = base.players[5].odentity;
    const totalBefore = sumChips(tables);

    // Bust 5 of 6 -> total drops to 12, live=3, threshold=6*(3-1)=12 -> exactly
    // one table_break (not a final-table redraw, which needs live===2).
    const played = bustPlayers(base, victims, winner);
    const result = await settleTableHand({
      tournament,
      tableNo: sixSeatTable,
      tableState: played,
      seed: 'seed-break1',
      now: Date.now(),
      getRegisteredAt: getRegisteredAtStub,
    });

    expect(result.events.some((e) => e.type === 'table_break')).toBe(true);
    expect(result.events.some((e) => e.type === 'final_table_redraw')).toBe(false);
    expect(result.removedTables).toHaveLength(1);

    const liveTableNos = Object.entries(result.tournament.tables)
      .filter(([, meta]) => !meta.broken)
      .map(([t]) => Number(t));
    expect(liveTableNos).toHaveLength(2);
    expect(liveTableNos).not.toContain(result.removedTables[0]);

    // Every live table must appear in updatedTables (all were touched: the
    // played table lost/gained seats, and the break necessarily redistributes
    // into every remaining table).
    const combined: Record<number, GameState> = { ...result.updatedTables };
    expect(sumChips(combined)).toBe(totalBefore);

    for (const tableNo of liveTableNos) {
      const rosterFromEntrants = Object.values(result.tournament.entrants)
        .filter((e) => e.tableNo === tableNo)
        .map((e) => e.wallet)
        .sort();
      const rosterFromTable = (result.updatedTables[tableNo]?.players ?? []).map((p) => p.odentity).sort();
      expect(rosterFromTable).toEqual(rosterFromEntrants);
    }
  });
});

describe('computeTablePhases / isTableClearedToStart', () => {
  it('gates every table behind the hand-for-hand barrier once on the bubble', () => {
    const tournament = makeStartedTournament(4, 'bubble1'); // 1 table of 4 — entrants only used for their wallets/registeredAt below
    const wallets = Object.keys(tournament.entrants);
    const level = currentBlindLevel(tournament);

    // Hand-build a clean 2-table, 2-seats-each fixture: table 1 has 2 entrants
    // (their hand just ended, sitting at 'waiting'), table 2 has 2 entrants
    // still mid-hand ('live'). 3 of the 4 are 'active', 1 already busted, and
    // top2 paid -> isBubble(3 active, 2 paid) === true.
    const tournamentOnBubble: TournamentState = {
      ...tournament,
      payoutTable: [65, 35], // top2 paid
      tables: {
        1: { tableNo: 1, buttonSeat: 0, emptySince: [0, 0, 0, 0, 0, 0], broken: false },
        2: { tableNo: 2, buttonSeat: 0, emptySince: [0, 0, 0, 0, 0, 0], broken: false },
      },
      entrants: {
        [wallets[0]]: { ...tournament.entrants[wallets[0]], status: 'active', tableNo: 1, seat: 0, stack: 5000 },
        [wallets[1]]: { ...tournament.entrants[wallets[1]], status: 'active', tableNo: 1, seat: 1, stack: 5000 },
        [wallets[2]]: { ...tournament.entrants[wallets[2]], status: 'active', tableNo: 2, seat: 0, stack: 5000 },
        [wallets[3]]: { ...tournament.entrants[wallets[3]], status: 'busted', tableNo: null, seat: null, stack: 0 },
      },
    };

    const t1 = { ...initTableFromDraw('t1', { tableNo: 1, seats: [wallets[0], wallets[1], null, null, null, null] }, 5000, level), phase: 'showdown' as const };
    // table 2 needs 2 occupants to be a valid live GameState; the second seat
    // is a non-entrant opponent used purely for engine plumbing (irrelevant
    // to this fixture — only table 1's phase-vs-barrier logic is under test).
    const t2 = initTableFromDraw('t2', { tableNo: 2, seats: [wallets[2], '0xnpc', null, null, null, null] }, 5000, level);

    const phases = computeTablePhases(tournamentOnBubble, { 1: t1, 2: t2 });
    expect(phases[1]).toBe('waiting');
    expect(phases[2]).toBe('live');
    expect(isTableClearedToStart(tournamentOnBubble, { 1: t1, 2: t2 }, 1)).toBe(false); // table 2 hasn't reached the barrier yet
  });
});

// ── real-hand fuzz test ───────────────────────────────────────────────

/** Drives every acting player all-in until the hand reaches showdown/finished —
 *  real engine.ts mechanics (side pots, hand evaluation) decide who busts. */
function playAllInHand(state: GameState): GameState {
  let s = state;
  let guard = 0;
  while (s.phase !== 'showdown' && s.phase !== 'finished' && guard < 40) {
    guard++;
    const player = s.players[s.activePlayerIndex];
    s = processAction(s, { type: 'allin', playerId: player.odentity });
  }
  return s;
}

async function simulateTournament(n: number, seed: string) {
  let tournament = makeStartedTournament(n, seed);
  const tables = initAllTables(tournament, currentBlindLevel(tournament));
  const startingTotal = sumChips(tables);
  let runningTotal = startingTotal;

  let guard = 0;
  const maxIterations = n * 60;
  while (tournament.lifecycle === 'running' && guard < maxIterations) {
    guard++;

    const liveTableNos = Object.entries(tournament.tables)
      .filter(([, meta]) => !meta.broken)
      .map(([t]) => Number(t));

    let progressedThisRound = false;

    for (const tableNo of liveTableNos) {
      const gs = tables[tableNo];
      if (!gs) continue;

      if (gs.phase === 'showdown') {
        if (!isTableClearedToStart(tournament, tables, tableNo)) continue;
        tables[tableNo] = advanceTableHand(gs, currentBlindLevel(tournament));
        progressedThisRound = true;
        continue;
      }
      if (gs.phase === 'finished') continue; // terminal — only the true final table, caught by lifecycle below

      const played = playAllInHand(gs);
      const result = await settleTableHand({
        tournament,
        tableNo,
        tableState: played,
        seed: `${seed}-h${guard}`,
        now: Date.now(),
        getRegisteredAt: getRegisteredAtStub,
      });

      tournament = result.tournament;
      for (const [t, g] of Object.entries(result.updatedTables)) tables[Number(t)] = g;
      for (const t of result.removedTables) delete tables[Number(t)];

      // Chips must never be FABRICATED by settlement/rebuild — total can only
      // stay flat or drop, and only by a few chips per hand at most. The drop
      // is pre-existing lib/poker/engine.ts split-pot behavior (endHand uses
      // Math.floor(pot / winnerCount) with no remainder sweep, unlike
      // ranking.ts's computePayouts which does sweep dust) — out of scope to
      // fix here since engine.ts stays unmodified; bounded and flagged instead.
      const total = sumChips(tables);
      expect(total).toBeLessThanOrEqual(runningTotal);
      expect(runningTotal - total).toBeLessThanOrEqual(5);
      runningTotal = total;

      progressedThisRound = true;
      break; // re-scan from the top after any settlement (table set may have changed)
    }

    if (!progressedThisRound) break; // stuck — the assertions below will catch it
  }

  return { tournament, guard, startingTotal };
}

describe('MTT engine end-to-end (real hands)', () => {
  it('runs many simulated tournaments to completion with no chip leakage and a valid ranking', async () => {
    const sizes = [7, 8, 12, 13, 18, 24];
    let run = 0;
    for (const n of sizes) {
      for (let trial = 0; trial < 4; trial++) {
        run++;
        const seed = `fuzz-${n}-${trial}`;
        const { tournament, guard, startingTotal } = await simulateTournament(n, seed);

        expect(tournament.lifecycle, `n=${n} trial=${trial} stalled after ${guard} iterations`).toBe('finished');
        // See the per-hand conservation comment above: bounded, not exact,
        // because of engine.ts's pre-existing split-pot floor-division dust.
        const finalTotal = sumEntrantStacks(tournament.entrants);
        expect(finalTotal).toBeLessThanOrEqual(startingTotal);
        expect(startingTotal - finalTotal).toBeLessThan(startingTotal * 0.01);

        // every entrant is accounted for exactly once
        expect(tournament.ranking.finishOrder).toHaveLength(n);
        expect(new Set(tournament.ranking.finishOrder.map((f) => f.wallet)).size).toBe(n);

        // Reconstruct the position-slot groups (a tie collapses to one range)
        // and verify they exactly partition [1, N] with no gaps or overlaps —
        // same technique ranking.test.ts's own 5,000-run fuzz uses.
        const seenGroupKeys = new Set<string>();
        const ranges: [number, number][] = [];
        for (const record of tournament.ranking.finishOrder) {
          const range: [number, number] = record.tiedRange ?? [record.finishPos, record.finishPos];
          const key = `${range[0]}-${range[1]}`;
          if (seenGroupKeys.has(key)) continue;
          seenGroupKeys.add(key);
          ranges.push(range);
        }
        ranges.sort((a, b) => a[0] - b[0]);
        let expectedNext = 1;
        for (const [start, end] of ranges) {
          expect(start).toBe(expectedNext);
          expect(end).toBeGreaterThanOrEqual(start);
          expectedNext = end + 1;
        }
        expect(expectedNext - 1).toBe(n);
      }
    }
    expect(run).toBe(24);
  }, 120_000);
});
