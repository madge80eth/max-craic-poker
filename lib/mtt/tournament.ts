// MTT lifecycle + seeded table draw — MTT-SPEC.md Phase 1 (§2, §3, §4, §8, §9).
// Pure, synchronous state-transition functions: no I/O, no Redis, no sealed
// component. Persistence adapters wire around this the same way redisStore.ts
// wires around lib/mtt/registration.ts.

import { hashSeed, mulberry32 } from './rng';
import type { TableMeta } from './balancing';
import type { RankingState } from './ranking';

export type TournamentLifecycle =
  | 'created'
  | 'registering'
  | 'running'
  | 'paused'
  | 'finished'
  | 'settled'
  | 'cancelled';

export interface TournamentStructure {
  startingStack: 5000 | 10000 | 20000;
  levelMins: 6 | 8 | 10 | 12 | 15;
  lateRegLevels: number;
  breaksEnabled: boolean;
  bbAnteFromLevel: number; // MTT-SPEC §3 default: level 4
}

export type PayoutTemplate = 'top2' | 'top3' | 'top5' | 'top7';

export const PAYOUT_TEMPLATES: Record<PayoutTemplate, number[]> = {
  top2: [65, 35],
  top3: [50, 30, 20],
  top5: [40, 27, 18, 10, 5],
  top7: [36, 24, 16, 10, 7, 4, 3],
};

/** MTT-SPEC §8 sizing guide — used as the wizard's suggested default, not enforced. */
export function suggestedPayoutTemplateFor(playerCount: number): PayoutTemplate {
  if (playerCount <= 9) return 'top2';
  if (playerCount <= 18) return 'top3';
  if (playerCount <= 30) return 'top5';
  return 'top7';
}

export interface TournamentConfig {
  minPlayers: number;
  structure: TournamentStructure;
  payoutTemplate: PayoutTemplate;
  scheduledStartTime: number; // ms epoch
}

export interface SeedLogEntry {
  purpose: 'initial_draw' | 'table_break' | 'final_table_redraw';
  seed: string;
  algorithm: 'fisher-yates-mulberry32';
  at: number;
}

export interface EntrantRecord {
  wallet: string;
  stack: number;
  tableNo: number | null;
  seat: number | null;
  status: 'active' | 'away' | 'busted';
  finishPos: number | null;
  timeBankRemaining: number; // seconds — one 60s bank per player per tournament (§7)
  sitOutForHands: number; // §5: a player moved into the seat just after the button sits out once
}

export interface TournamentState {
  tournamentId: string;
  config: TournamentConfig;
  lifecycle: TournamentLifecycle;
  currentLevel: number;
  levelClockAnchor: number | null;
  onBreak: boolean; // MTT-SPEC §3: 5 min break after every 4 levels, if enabled
  payoutTable: number[];
  seedLog: SeedLogEntry[];
  entrants: Record<string, EntrantRecord>;
  // Live-wiring additions (Phase P3/P4 integration) — populated by start/route.ts
  // right after startTournament() succeeds, via balancing.ts's initSeatingState()
  // and ranking.ts's initRanking(). Kept out of this pure module to avoid a
  // runtime import cycle (balancing.ts/ranking.ts import types from here).
  tables: Record<number, TableMeta>;
  finalTableReached: boolean;
  ranking: RankingState;
}

export interface TableAssignment {
  tableNo: number;
  seats: (string | null)[]; // length 6, entrant wallet (lowercased) or null
}

export type Result<T> = { ok: true; state: T } | { ok: false; error: string };

export function createTournament(tournamentId: string, config: TournamentConfig): TournamentState {
  return {
    tournamentId,
    config,
    lifecycle: 'created',
    currentLevel: 0,
    levelClockAnchor: null,
    onBreak: false,
    payoutTable: PAYOUT_TEMPLATES[config.payoutTemplate],
    seedLog: [],
    entrants: {},
    tables: {},
    finalTableReached: false,
    ranking: { totalEntrants: 0, nextFinishPos: 0, finishOrder: [] },
  };
}

export function openRegistration(state: TournamentState): Result<TournamentState> {
  if (state.lifecycle !== 'created') {
    return { ok: false, error: `Cannot open registration from lifecycle "${state.lifecycle}"` };
  }
  return { ok: true, state: { ...state, lifecycle: 'registering' } };
}

export function registerEntrant(state: TournamentState, wallet: string): Result<TournamentState> {
  if (state.lifecycle !== 'registering') {
    return { ok: false, error: `Cannot register while lifecycle is "${state.lifecycle}"` };
  }
  const key = wallet.toLowerCase();
  if (state.entrants[key]) {
    return { ok: false, error: 'Wallet already registered' };
  }
  const record: EntrantRecord = {
    wallet: key,
    stack: 0,
    tableNo: null,
    seat: null,
    status: 'active',
    finishPos: null,
    timeBankRemaining: 60,
    sitOutForHands: 0,
  };
  return { ok: true, state: { ...state, entrants: { ...state.entrants, [key]: record } } };
}

export function cancelTournament(state: TournamentState): Result<TournamentState> {
  if (state.lifecycle !== 'created' && state.lifecycle !== 'registering') {
    return { ok: false, error: `Cannot cancel from lifecycle "${state.lifecycle}"` };
  }
  return { ok: true, state: { ...state, lifecycle: 'cancelled' } };
}

/**
 * Seeded table draw — MTT-SPEC §4. Tables numbered 1..K, K = ceil(N/6),
 * initial sizes differ by at most 1. The RNG is seeded and reproducible.
 */
export function drawTables(wallets: string[], seed: string): TableAssignment[] {
  const rand = mulberry32(hashSeed(seed));
  const shuffled = [...wallets];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const n = shuffled.length;
  const k = Math.max(1, Math.ceil(n / 6));
  const base = Math.floor(n / k);
  const remainder = n % k;

  const tables: TableAssignment[] = [];
  let cursor = 0;
  for (let t = 0; t < k; t++) {
    const size = base + (t < remainder ? 1 : 0);
    const seats: (string | null)[] = new Array(6).fill(null);
    for (let s = 0; s < size; s++) {
      seats[s] = shuffled[cursor++];
    }
    tables.push({ tableNo: t + 1, seats });
  }
  return tables;
}

export function startTournament(state: TournamentState, seed: string, now: number): Result<TournamentState> {
  if (state.lifecycle !== 'registering') {
    return { ok: false, error: `Cannot start from lifecycle "${state.lifecycle}"` };
  }
  const wallets = Object.keys(state.entrants).filter((w) => state.entrants[w].status === 'active');
  if (wallets.length < state.config.minPlayers) {
    return { ok: false, error: `Need at least ${state.config.minPlayers} players, have ${wallets.length}` };
  }

  const seedLogEntry: SeedLogEntry = { purpose: 'initial_draw', seed, algorithm: 'fisher-yates-mulberry32', at: now };
  const tables = drawTables(wallets, seed);

  const entrants = { ...state.entrants };
  for (const table of tables) {
    table.seats.forEach((wallet, seatIndex) => {
      if (!wallet) return;
      entrants[wallet] = {
        ...entrants[wallet],
        tableNo: table.tableNo,
        seat: seatIndex,
        stack: state.config.structure.startingStack,
      };
    });
  }

  return {
    ok: true,
    state: {
      ...state,
      lifecycle: 'running',
      currentLevel: 1,
      levelClockAnchor: now,
      entrants,
      seedLog: [...state.seedLog, seedLogEntry],
    },
  };
}
