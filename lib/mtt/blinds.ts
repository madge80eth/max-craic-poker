// Global blind schedule + level clock — MTT-SPEC.md Phase 2 (§3).
// "The level clock is global and server-timestamp based — one clock for the
// whole tournament, not per table." This module owns that clock; table
// engines (lib/mtt/tableEngine.ts) just read whatever level it reports.

import { TournamentState } from './tournament';

export interface BlindLevel {
  level: number;
  sb: number;
  bb: number;
  ante: number;
}

export const BREAK_MINUTES = 5;
export const LEVELS_BETWEEN_BREAKS = 4;

/** MTT-SPEC §3 default schedule, L1-L14. Beyond L14, blinds double per level. */
const DEFAULT_BLIND_TABLE: { sb: number; bb: number }[] = [
  { sb: 50, bb: 100 },
  { sb: 75, bb: 150 },
  { sb: 100, bb: 200 },
  { sb: 150, bb: 300 },
  { sb: 200, bb: 400 },
  { sb: 300, bb: 600 },
  { sb: 400, bb: 800 },
  { sb: 500, bb: 1000 },
  { sb: 700, bb: 1400 },
  { sb: 1000, bb: 2000 },
  { sb: 1500, bb: 3000 },
  { sb: 2000, bb: 4000 },
  { sb: 3000, bb: 6000 },
  { sb: 5000, bb: 10000 },
];

/** BB ante rationale (§3): one post per hand, from `bbAnteFromLevel` onward, ante = 1 BB. */
export function blindLevelFor(levelNumber: number, bbAnteFromLevel: number): BlindLevel {
  let sb: number;
  let bb: number;
  if (levelNumber <= DEFAULT_BLIND_TABLE.length) {
    ({ sb, bb } = DEFAULT_BLIND_TABLE[levelNumber - 1]);
  } else {
    const doublings = levelNumber - DEFAULT_BLIND_TABLE.length;
    const base = DEFAULT_BLIND_TABLE[DEFAULT_BLIND_TABLE.length - 1];
    const mult = Math.pow(2, doublings);
    sb = base.sb * mult;
    bb = base.bb * mult;
  }
  const ante = levelNumber >= bbAnteFromLevel ? bb : 0;
  return { level: levelNumber, sb, bb, ante };
}

function segmentDurationMs(state: TournamentState): number {
  if (state.onBreak) return BREAK_MINUTES * 60_000;
  return state.config.structure.levelMins * 60_000;
}

/**
 * Advance the global level clock to `now`. Freezes while not 'running'
 * (covers 'paused' per §2: "freezes the level clock and blocks new hands").
 * Loops to catch up correctly even if called after a long gap (e.g. the
 * server was asleep) rather than skipping levels.
 */
export function tickLevelClock(state: TournamentState, now: number): TournamentState {
  if (state.lifecycle !== 'running' || state.levelClockAnchor === null) return state;

  let next = state;
  let iterations = 0;
  const MAX_ITERATIONS = 100_000; // safety cap against a malformed config looping forever

  while (next.levelClockAnchor !== null && now >= next.levelClockAnchor + segmentDurationMs(next) && iterations < MAX_ITERATIONS) {
    iterations++;
    const boundary = next.levelClockAnchor + segmentDurationMs(next);
    const breaksEnabled = next.config.structure.breaksEnabled;
    const justFinishedBreak = next.onBreak;

    if (justFinishedBreak) {
      next = { ...next, onBreak: false, currentLevel: next.currentLevel + 1, levelClockAnchor: boundary };
      continue;
    }

    const shouldBreakNow = breaksEnabled && next.currentLevel % LEVELS_BETWEEN_BREAKS === 0;
    if (shouldBreakNow) {
      next = { ...next, onBreak: true, levelClockAnchor: boundary };
    } else {
      next = { ...next, currentLevel: next.currentLevel + 1, levelClockAnchor: boundary };
    }
  }

  return next;
}

export function currentBlindLevel(state: TournamentState): BlindLevel {
  return blindLevelFor(state.currentLevel, state.config.structure.bbAnteFromLevel);
}
