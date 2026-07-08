import { describe, expect, it } from 'vitest';
import { blindLevelFor, currentBlindLevel, tickLevelClock } from './blinds';
import { createTournament, openRegistration, registerEntrant, startTournament, TournamentConfig } from './tournament';

describe('blindLevelFor (MTT-SPEC §3 default schedule)', () => {
  const EXPECTED: [number, number, number][] = [
    [1, 50, 100],
    [2, 75, 150],
    [3, 100, 200],
    [4, 150, 300],
    [5, 200, 400],
    [6, 300, 600],
    [7, 400, 800],
    [8, 500, 1000],
    [9, 700, 1400],
    [10, 1000, 2000],
    [11, 1500, 3000],
    [12, 2000, 4000],
    [13, 3000, 6000],
    [14, 5000, 10000],
  ];

  it.each(EXPECTED)('level %i is %i/%i', (level, sb, bb) => {
    const result = blindLevelFor(level, 4);
    expect(result.sb).toBe(sb);
    expect(result.bb).toBe(bb);
  });

  it('has no ante before bbAnteFromLevel', () => {
    expect(blindLevelFor(3, 4).ante).toBe(0);
  });

  it('posts a 1BB ante from bbAnteFromLevel onward', () => {
    expect(blindLevelFor(4, 4).ante).toBe(300);
    expect(blindLevelFor(14, 4).ante).toBe(10000);
  });

  it('doubles blinds per level beyond L14', () => {
    expect(blindLevelFor(15, 4)).toEqual({ level: 15, sb: 10000, bb: 20000, ante: 20000 });
    expect(blindLevelFor(16, 4)).toEqual({ level: 16, sb: 20000, bb: 40000, ante: 40000 });
  });
});

/** Builds a 24-player tournament, running, at level 1, with a fixed start time. */
function make24PlayerRunningTournament(now: number) {
  const config: TournamentConfig = {
    minPlayers: 6,
    structure: { startingStack: 10000, levelMins: 8, lateRegLevels: 4, breaksEnabled: true, bbAnteFromLevel: 4 },
    payoutTemplate: 'top5',
    scheduledStartTime: now,
  };
  let t = createTournament('t-clock', config);
  t = (openRegistration(t) as { ok: true; state: typeof t }).state;
  for (let i = 0; i < 24; i++) {
    t = (registerEntrant(t, `0x${i.toString(16).padStart(40, '0')}`) as { ok: true; state: typeof t }).state;
  }
  const started = startTournament(t, 'clock-seed', now);
  if (!started.ok) throw new Error(started.error);
  return started.state;
}

describe('tickLevelClock — 24-player, 12-level simulated run (P2 prompt)', () => {
  const START = Date.parse('2026-07-08T18:00:00Z');
  const LEVEL_MS = 8 * 60_000;
  const BREAK_MS = 5 * 60_000;

  /** Cumulative ms elapsed from tournament start to the moment level N begins. */
  function elapsedAtLevelStart(targetLevel: number): number {
    let elapsed = 0;
    for (let level = 1; level < targetLevel; level++) {
      elapsed += LEVEL_MS;
      if (level % 4 === 0) elapsed += BREAK_MS; // break after levels 4, 8, ...
    }
    return elapsed;
  }

  it('advances through exactly 12 levels (with breaks after L4 and L8) via one large jump', () => {
    const t0 = make24PlayerRunningTournament(START);
    expect(t0.currentLevel).toBe(1);
    expect(t0.onBreak).toBe(false);

    const target = START + elapsedAtLevelStart(12) + 1000; // 1s into level 12
    const advanced = tickLevelClock(t0, target);

    expect(advanced.currentLevel).toBe(12);
    expect(advanced.onBreak).toBe(false);
    expect(advanced.levelClockAnchor).toBe(START + elapsedAtLevelStart(12));
  });

  it('enters break state after level 4 completes, before level 5 starts', () => {
    const t0 = make24PlayerRunningTournament(START);
    const justAfterL4Ends = START + elapsedAtLevelStart(4) + LEVEL_MS + 1000;
    const advanced = tickLevelClock(t0, justAfterL4Ends);

    expect(advanced.currentLevel).toBe(4); // level number doesn't change during break
    expect(advanced.onBreak).toBe(true);
  });

  it('produces the identical final state whether ticked in one jump or many small steps', () => {
    const t0 = make24PlayerRunningTournament(START);
    const target = START + elapsedAtLevelStart(12) + 90_000;

    const bigJump = tickLevelClock(t0, target);

    let stepped = t0;
    for (let now = START; now <= target; now += 45_000) {
      stepped = tickLevelClock(stepped, now);
    }
    stepped = tickLevelClock(stepped, target);

    expect(stepped.currentLevel).toBe(bigJump.currentLevel);
    expect(stepped.onBreak).toBe(bigJump.onBreak);
    expect(stepped.levelClockAnchor).toBe(bigJump.levelClockAnchor);
  });

  it('freezes while paused', () => {
    const t0 = make24PlayerRunningTournament(START);
    const paused = { ...t0, lifecycle: 'paused' as const };
    const advanced = tickLevelClock(paused, START + 10 * LEVEL_MS);
    expect(advanced).toEqual(paused);
  });

  it('reports the correct current blind level (including ante) as the clock advances', () => {
    const t0 = make24PlayerRunningTournament(START);
    expect(currentBlindLevel(t0)).toEqual({ level: 1, sb: 50, bb: 100, ante: 0 });

    const atLevel5 = tickLevelClock(t0, START + elapsedAtLevelStart(5) + 1000);
    expect(currentBlindLevel(atLevel5)).toEqual({ level: 5, sb: 200, bb: 400, ante: 400 });
  });
});
