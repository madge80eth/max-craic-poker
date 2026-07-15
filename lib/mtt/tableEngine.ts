// Adapter around the EXISTING single-table poker engine (lib/poker/engine.ts).
// MTT-SPEC.md Phase 2: "Reuse the existing single-table hand engine
// unmodified." This file contains zero changes to lib/poker/engine.ts —
// it only builds the GameConfig/GameState shapes that engine already reads,
// and decides *when* to call startGame/startHand based on the global clock.

import { createGame, addPlayer, startGame, startHand } from '@/lib/poker/engine';
import { GameConfig, GameState } from '@/lib/poker/types';
import { BlindLevel } from './blinds';
import { TableAssignment } from './tournament';

function toEngineBlindLevel(blindLevel: BlindLevel) {
  return {
    level: blindLevel.level,
    smallBlind: blindLevel.sb,
    bigBlind: blindLevel.bb,
    ante: blindLevel.ante,
    duration: 0, // unused — the global clock (lib/mtt/blinds.ts) owns timing, not the engine
  };
}

/** Builds a fresh table GameState from a draw assignment and deals the first hand. */
export function initTableFromDraw(tableId: string, assignment: TableAssignment, startingStack: number, blindLevel: BlindLevel): GameState {
  const config: GameConfig = {
    maxPlayers: 6,
    startingChips: startingStack,
    blindLevels: [toEngineBlindLevel(blindLevel)],
    actionTimeout: 30,
    payoutStructure: [65, 35], // unused at table level — MTT payouts are tournament-wide (P4)
  };

  let state = createGame(tableId, config);
  assignment.seats.forEach((wallet, seatIndex) => {
    if (!wallet) return;
    state = addPlayer(state, wallet, wallet, seatIndex);
  });
  return startGame(state);
}

/**
 * Patches a table's config to the CURRENT global blind level. Pure —
 * engine.startHand() reads state.config.blindLevels[state.blindLevel], so
 * this only needs a single-entry array at index 0. Call before every
 * startHand() so each new hand uses whatever level the global clock reports.
 */
export function withGlobalBlinds(state: GameState, blindLevel: BlindLevel): GameState {
  return {
    ...state,
    blindLevel: 0,
    config: { ...state.config, blindLevels: [toEngineBlindLevel(blindLevel)] },
  };
}

/** Deals the next hand at a table once it's between hands (phase === 'showdown'). */
export function advanceTableHand(state: GameState, blindLevel: BlindLevel): GameState {
  if (state.phase !== 'showdown') {
    throw new Error(`Cannot advance table ${state.tableId} from phase "${state.phase}"`);
  }
  return startHand(withGlobalBlinds(state, blindLevel));
}

/**
 * Rebuilds a table's GameState from scratch for a new seat composition (a
 * balancing move-in, a table break redistribution, or the final-table
 * redraw) — required because engine.ts's addPlayer only works from
 * phase==='waiting', so a live table can't have players added/removed in
 * place. Reuses createGame/addPlayer/startGame completely unmodified; the
 * only adapter-side step is patching each seated player's chips to their
 * REAL current stack afterward (addPlayer always seats new joiners at
 * config.startingChips, which is wrong for anyone who already played
 * hands). startGame() deals the first hand immediately, same as a draw.
 */
export function rebuildTableWithStacks(
  tableId: string,
  assignment: TableAssignment,
  stacks: Record<string, number>,
  blindLevel: BlindLevel
): GameState | null {
  const occupied = assignment.seats.filter((w): w is string => w !== null);
  if (occupied.length < 2) return null; // not enough players to deal a hand — caller's problem to resolve (tournament finish)

  const config: GameConfig = {
    maxPlayers: 6,
    startingChips: 0, // irrelevant — every seat's chips are patched below
    blindLevels: [toEngineBlindLevel(blindLevel)],
    actionTimeout: 30,
    payoutStructure: [65, 35], // unused at table level — MTT payouts are tournament-wide (P4)
  };

  let state = createGame(tableId, config);
  assignment.seats.forEach((wallet, seatIndex) => {
    if (!wallet) return;
    state = addPlayer(state, wallet, wallet, seatIndex);
  });

  state = {
    ...state,
    players: state.players.map((p) => ({ ...p, chips: stacks[p.odentity] ?? p.chips })),
  };

  return startGame(state);
}
