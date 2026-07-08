// Table balancing, breaking, and the final table — MTT-SPEC.md Phase 3 (§5).
// This is pure seat/table bookkeeping that runs BETWEEN hands (never mid-hand
// — the API is only ever called once a hand has finished, so "never move a
// player mid-hand" holds by construction). It knows nothing about poker rules;
// lib/mtt/tableEngine.ts / multiTable.ts own dealing actual cards.

import { hashSeed, mulberry32 } from './rng';
import { EntrantRecord, TournamentState } from './tournament';

export const SEATS_PER_TABLE = 6;

export interface TableMeta {
  tableNo: number;
  buttonSeat: number; // rotates one seat per hand; used to find "next to post BB"
  emptySince: number[]; // length 6, hands-in-a-row each seat has been empty (0 if occupied)
  broken: boolean;
}

export interface BalancingEvent {
  type: 'move' | 'table_break' | 'final_table_redraw';
  wallet?: string;
  fromTable?: number;
  toTable?: number;
  brokenTable?: number;
  bannerText?: string;
  at: number;
}

export interface SeatingState {
  entrants: Record<string, EntrantRecord>;
  tables: Record<number, TableMeta>;
  finalTableReached: boolean;
}

function occupiedSeats(entrants: Record<string, EntrantRecord>, tableNo: number): number[] {
  return Object.values(entrants)
    .filter((e) => e.status !== 'busted' && e.tableNo === tableNo)
    .map((e) => e.seat as number);
}

function walletAtSeat(entrants: Record<string, EntrantRecord>, tableNo: number, seat: number): string | null {
  const e = Object.values(entrants).find((e) => e.status !== 'busted' && e.tableNo === tableNo && e.seat === seat);
  return e ? e.wallet : null;
}

export function initSeatingState(tournament: TournamentState): SeatingState {
  const tableNos = new Set<number>();
  for (const e of Object.values(tournament.entrants)) {
    if (e.tableNo !== null) tableNos.add(e.tableNo);
  }
  const tables: Record<number, TableMeta> = {};
  for (const tableNo of tableNos) {
    tables[tableNo] = { tableNo, buttonSeat: 0, emptySince: new Array(SEATS_PER_TABLE).fill(0), broken: false };
  }
  return { entrants: { ...tournament.entrants }, tables, finalTableReached: false };
}

function liveTableNos(state: SeatingState): number[] {
  return Object.values(state.tables)
    .filter((t) => !t.broken)
    .map((t) => t.tableNo);
}

function countActive(state: SeatingState): number {
  return Object.values(state.entrants).filter((e) => e.status !== 'busted').length;
}

/** BB seat = 2 seats clockwise from the button among currently occupied seats. */
function bbSeatOf(state: SeatingState, tableNo: number): number | null {
  const occ = occupiedSeats(state.entrants, tableNo).sort((a, b) => a - b);
  if (occ.length === 0) return null;
  const button = state.tables[tableNo].buttonSeat;
  const ring = occ.filter((s) => s !== button);
  if (ring.length === 0) return occ[0]; // heads-up-ish degenerate case
  const afterButton = [...occ, ...occ].find((s) => s > button) ?? occ[0];
  const idx = occ.indexOf(afterButton);
  return occ.length >= 2 ? occ[(idx + 1) % occ.length] : afterButton;
}

/** Records eliminations at a table (seat cleared, entrant marked busted). Ranking is Phase 4's job. */
export function recordEliminations(state: SeatingState, tableNo: number, bustedWallets: string[]): SeatingState {
  const entrants = { ...state.entrants };
  for (const wallet of bustedWallets) {
    const e = entrants[wallet];
    if (!e) continue;
    entrants[wallet] = { ...e, status: 'busted', tableNo: null, seat: null };
  }
  return { ...state, entrants };
}

/** Call once per completed hand at a table: rotates the button and ages empty seats. */
export function advanceTableClock(state: SeatingState, tableNo: number): SeatingState {
  const table = state.tables[tableNo];
  if (!table || table.broken) return state;

  const occ = occupiedSeats(state.entrants, tableNo);
  let nextButton = table.buttonSeat;
  if (occ.length > 0) {
    do {
      nextButton = (nextButton + 1) % SEATS_PER_TABLE;
    } while (!occ.includes(nextButton));
  }

  const emptySince = table.emptySince.map((count, seat) => (occ.includes(seat) ? 0 : count + 1));

  return { ...state, tables: { ...state.tables, [tableNo]: { ...table, buttonSeat: nextButton, emptySince } } };
}

function moveOnePlayer(state: SeatingState, fromTableNo: number, toTableNo: number, now: number): { state: SeatingState; event: BalancingEvent | null } {
  const bbSeat = bbSeatOf(state, fromTableNo);
  if (bbSeat === null) return { state, event: null };
  const wallet = walletAtSeat(state.entrants, fromTableNo, bbSeat);
  if (!wallet) return { state, event: null };

  const toTable = state.tables[toTableNo];
  let destSeat = 0;
  let longestEmpty = -1;
  for (let s = 0; s < SEATS_PER_TABLE; s++) {
    if (occupiedSeats(state.entrants, toTableNo).includes(s)) continue;
    if (toTable.emptySince[s] > longestEmpty) {
      longestEmpty = toTable.emptySince[s];
      destSeat = s;
    }
  }

  // §5: sit out one hand only if seated directly in the small-blind seat
  // (the position immediately after the button) — HONEST SIMPLIFICATION of
  // "between the small blind and the button": with only those two named
  // reference points, the SB seat itself is that gap.
  const destOcc = occupiedSeats(state.entrants, toTableNo);
  const destRing = [...destOcc].sort((a, b) => a - b);
  const sbSeat = destRing.length > 0 ? (toTable.buttonSeat + 1) % SEATS_PER_TABLE : null;
  const sitOut = destSeat === sbSeat ? 1 : 0;

  const entrant = state.entrants[wallet];
  const entrants = {
    ...state.entrants,
    [wallet]: { ...entrant, tableNo: toTableNo, seat: destSeat, sitOutForHands: sitOut },
  };

  const tables = {
    ...state.tables,
    [fromTableNo]: { ...state.tables[fromTableNo], emptySince: state.tables[fromTableNo].emptySince.map((v, s) => (s === bbSeat ? 0 : v)) },
    [toTableNo]: { ...toTable, emptySince: toTable.emptySince.map((v, s) => (s === destSeat ? 0 : v)) },
  };

  return {
    state: { ...state, entrants, tables },
    event: { type: 'move', wallet, fromTable: fromTableNo, toTable: toTableNo, at: now },
  };
}

/** §5 invariant: max(tableSize) - min(tableSize) <= 1 across live tables, restored one move at a time. */
export function applyBalancing(state: SeatingState, now: number): { state: SeatingState; events: BalancingEvent[] } {
  let s = state;
  const events: BalancingEvent[] = [];
  let guard = 0;

  while (guard++ < 1000) {
    const live = liveTableNos(s);
    if (live.length <= 1) break;

    const sizes = live.map((tableNo) => ({ tableNo, size: occupiedSeats(s.entrants, tableNo).length }));
    const max = sizes.reduce((a, b) => (b.size > a.size ? b : a));
    const min = sizes.reduce((a, b) => (b.size < a.size ? b : a));
    if (max.size - min.size < 2) break;

    const { state: moved, event } = moveOnePlayer(s, max.tableNo, min.tableNo, now);
    if (!event) break; // nothing movable — avoid an infinite loop on a malformed state
    s = moved;
    events.push(event);
  }

  return { state: s, events };
}

function breakTable(state: SeatingState, tableNo: number, seed: string, now: number): { state: SeatingState; events: BalancingEvent[] } {
  const wallets = occupiedSeats(state.entrants, tableNo).map((seat) => walletAtSeat(state.entrants, tableNo, seat)!);
  const shuffled = seededShuffleLocal(wallets, seed);

  const destinations = liveTableNos(state).filter((t) => t !== tableNo);
  // Fill the currently-smallest tables first so the redistribution starts balanced.
  const openSlots: { tableNo: number; seat: number }[] = [];
  for (const t of destinations) {
    for (let seat = 0; seat < SEATS_PER_TABLE; seat++) {
      if (!occupiedSeats(state.entrants, t).includes(seat)) openSlots.push({ tableNo: t, seat });
    }
  }
  openSlots.sort((a, b) => occupiedSeats(state.entrants, a.tableNo).length - occupiedSeats(state.entrants, b.tableNo).length);

  const entrants = { ...state.entrants };
  const tables = { ...state.tables, [tableNo]: { ...state.tables[tableNo], broken: true } };
  const events: BalancingEvent[] = [{ type: 'table_break', brokenTable: tableNo, at: now }];

  shuffled.forEach((wallet, i) => {
    const slot = openSlots[i];
    entrants[wallet] = { ...entrants[wallet], tableNo: slot.tableNo, seat: slot.seat };
    tables[slot.tableNo] = {
      ...tables[slot.tableNo],
      emptySince: tables[slot.tableNo].emptySince.map((v, s) => (s === slot.seat ? 0 : v)),
    };
    events.push({ type: 'move', wallet, fromTable: tableNo, toTable: slot.tableNo, at: now });
  });

  return { state: { ...state, entrants, tables }, events };
}

function consolidateToFinalTable(state: SeatingState, seed: string, now: number): { state: SeatingState; events: BalancingEvent[] } {
  const live = liveTableNos(state);
  const finalTableNo = Math.min(...live);
  const allWallets = Object.values(state.entrants)
    .filter((e) => e.status !== 'busted')
    .map((e) => e.wallet);
  const shuffled = seededShuffleLocal(allWallets, seed);

  const entrants = { ...state.entrants };
  const tables = { ...state.tables };
  for (const t of live) {
    tables[t] = { ...tables[t], broken: t !== finalTableNo, emptySince: new Array(SEATS_PER_TABLE).fill(0), buttonSeat: 0 };
  }

  shuffled.forEach((wallet, seat) => {
    entrants[wallet] = { ...entrants[wallet], tableNo: finalTableNo, seat };
  });

  return {
    state: { ...state, entrants, tables, finalTableReached: true },
    events: [{ type: 'final_table_redraw', toTable: finalTableNo, bannerText: 'FINAL TABLE', at: now }],
  };
}

/** §5 table breaking + final-table consolidation, cascading as needed. */
export function applyBreakingAndFinalTable(state: SeatingState, seed: string, now: number): { state: SeatingState; events: BalancingEvent[] } {
  let s = state;
  const events: BalancingEvent[] = [];
  let guard = 0;

  while (guard++ < 100) {
    const live = liveTableNos(s);
    if (live.length <= 1) break;

    const total = countActive(s);
    if (total > SEATS_PER_TABLE * (live.length - 1)) break;

    if (live.length === 2 && total <= SEATS_PER_TABLE) {
      const result = consolidateToFinalTable(s, `${seed}-final`, now);
      s = result.state;
      events.push(...result.events);
      break;
    }

    const highest = Math.max(...live);
    const broken = breakTable(s, highest, `${seed}-break-${highest}-${guard}`, now);
    s = broken.state;
    events.push(...broken.events);

    const rebalanced = applyBalancing(s, now);
    s = rebalanced.state;
    events.push(...rebalanced.events);
  }

  return { state: s, events };
}

/** Full post-hand settlement: eliminate, age the clock, balance, break, and check for the final table. */
export function settleAfterHand(
  state: SeatingState,
  tableNo: number,
  bustedWallets: string[],
  seed: string,
  now: number
): { state: SeatingState; events: BalancingEvent[] } {
  let s = recordEliminations(state, tableNo, bustedWallets);
  s = advanceTableClock(s, tableNo);

  const balanced = applyBalancing(s, now);
  s = balanced.state;

  const settled = applyBreakingAndFinalTable(s, seed, now);
  s = settled.state;

  return { state: s, events: [...balanced.events, ...settled.events] };
}

function seededShuffleLocal(items: string[], seed: string): string[] {
  const rand = mulberry32(hashSeed(seed));
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
