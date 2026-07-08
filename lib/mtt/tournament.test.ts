import { describe, expect, it } from 'vitest';
import {
  cancelTournament,
  createTournament,
  drawTables,
  openRegistration,
  registerEntrant,
  startTournament,
  TournamentConfig,
} from './tournament';

const BASE_CONFIG: TournamentConfig = {
  minPlayers: 6,
  structure: { startingStack: 10000, levelMins: 8, lateRegLevels: 4, breaksEnabled: true, bbAnteFromLevel: 4 },
  payoutTemplate: 'top3',
  scheduledStartTime: Date.now(),
};

function registerN(state: ReturnType<typeof createTournament>, n: number) {
  let s = state;
  for (let i = 0; i < n; i++) {
    const r = registerEntrant(s, `0x${i.toString(16).padStart(40, '0')}`);
    if (!r.ok) throw new Error(r.error);
    s = r.state;
  }
  return s;
}

describe('tournament lifecycle', () => {
  it('starts in "created"', () => {
    const t = createTournament('t1', BASE_CONFIG);
    expect(t.lifecycle).toBe('created');
  });

  it('opens registration only from "created"', () => {
    const t = createTournament('t1', BASE_CONFIG);
    const r1 = openRegistration(t);
    expect(r1.ok).toBe(true);
    if (r1.ok) {
      const r2 = openRegistration(r1.state);
      expect(r2.ok).toBe(false);
    }
  });

  it('rejects registration before registering opens', () => {
    const t = createTournament('t1', BASE_CONFIG);
    const r = registerEntrant(t, '0xabc');
    expect(r.ok).toBe(false);
  });

  it('rejects duplicate registration', () => {
    let t = createTournament('t1', BASE_CONFIG);
    t = (openRegistration(t) as { ok: true; state: typeof t }).state;
    const first = registerEntrant(t, '0xabc');
    expect(first.ok).toBe(true);
    if (first.ok) {
      const second = registerEntrant(first.state, '0xABC'); // case-insensitive dup
      expect(second.ok).toBe(false);
    }
  });

  it('rejects starting below minPlayers', () => {
    let t = createTournament('t1', BASE_CONFIG);
    t = (openRegistration(t) as { ok: true; state: typeof t }).state;
    t = registerN(t, 3); // below minPlayers=6
    const result = startTournament(t, 'seed-1', Date.now());
    expect(result.ok).toBe(false);
  });

  it('starts successfully once minPlayers is met, seats everyone, logs the seed', () => {
    let t = createTournament('t1', BASE_CONFIG);
    t = (openRegistration(t) as { ok: true; state: typeof t }).state;
    t = registerN(t, 12);
    const result = startTournament(t, 'seed-42', 1000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.lifecycle).toBe('running');
    expect(result.state.currentLevel).toBe(1);
    expect(result.state.levelClockAnchor).toBe(1000);
    expect(result.state.seedLog).toHaveLength(1);
    expect(result.state.seedLog[0].seed).toBe('seed-42');
    expect(result.state.seedLog[0].purpose).toBe('initial_draw');

    for (const entrant of Object.values(result.state.entrants)) {
      expect(entrant.tableNo).not.toBeNull();
      expect(entrant.seat).not.toBeNull();
      expect(entrant.stack).toBe(10000);
    }
  });

  it('cannot start twice', () => {
    let t = createTournament('t1', BASE_CONFIG);
    t = (openRegistration(t) as { ok: true; state: typeof t }).state;
    t = registerN(t, 6);
    const first = startTournament(t, 'seed-1', 1000);
    expect(first.ok).toBe(true);
    if (first.ok) {
      const second = startTournament(first.state, 'seed-2', 2000);
      expect(second.ok).toBe(false);
    }
  });

  it('can cancel from "created" or "registering" but not after running', () => {
    let t = createTournament('t1', BASE_CONFIG);
    expect(cancelTournament(t).ok).toBe(true);

    t = (openRegistration(t) as { ok: true; state: typeof t }).state;
    expect(cancelTournament(t).ok).toBe(true);

    t = registerN(t, 6);
    const started = startTournament(t, 'seed-1', 1000);
    expect(started.ok).toBe(true);
    if (started.ok) {
      expect(cancelTournament(started.state).ok).toBe(false);
    }
  });
});

describe('drawTables — evenness and determinism (MTT-SPEC §4)', () => {
  function walletsOf(n: number) {
    return Array.from({ length: n }, (_, i) => `0x${i.toString(16).padStart(40, '0')}`);
  }

  it('produces ceil(N/6) tables with sizes differing by at most 1, across 6..60 players and many seeds', () => {
    for (let n = 6; n <= 60; n++) {
      const wallets = walletsOf(n);
      for (let seedIdx = 0; seedIdx < 40; seedIdx++) {
        const tables = drawTables(wallets, `seed-${n}-${seedIdx}`);
        const expectedTableCount = Math.ceil(n / 6);
        expect(tables).toHaveLength(expectedTableCount);

        const sizes = tables.map((t) => t.seats.filter((s) => s !== null).length);
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
        expect(sizes.reduce((a, b) => a + b, 0)).toBe(n);

        // every wallet seated exactly once, no duplicates, no seat collisions
        const seated = tables.flatMap((t) => t.seats.filter((s): s is string => s !== null));
        expect(new Set(seated).size).toBe(n);
        expect(seated.sort()).toEqual([...wallets].sort());

        for (const table of tables) {
          const occupied = table.seats.filter((s) => s !== null);
          expect(new Set(occupied).size).toBe(occupied.length);
        }
      }
    }
  });

  it('is deterministic: same wallets + same seed always produce the same assignment', () => {
    const wallets = walletsOf(24);
    const a = drawTables(wallets, 'reproducible-seed');
    const b = drawTables(wallets, 'reproducible-seed');
    expect(a).toEqual(b);
  });

  it('different seeds produce different assignments (sanity check the RNG is actually used)', () => {
    const wallets = walletsOf(24);
    const a = drawTables(wallets, 'seed-a');
    const b = drawTables(wallets, 'seed-b');
    expect(a).not.toEqual(b);
  });

  it('handles the single-table minimum (6 players -> 1 table)', () => {
    const tables = drawTables(walletsOf(6), 'seed');
    expect(tables).toHaveLength(1);
    expect(tables[0].seats.filter((s) => s !== null)).toHaveLength(6);
  });
});
