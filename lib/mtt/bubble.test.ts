import { describe, expect, it } from 'vitest';
import { allTablesAtBarrier, isBubble, tablesReadyToStart } from './bubble';

describe('isBubble', () => {
  it('is true when exactly one elimination remains before the money', () => {
    expect(isBubble(10, 9)).toBe(true); // 9 paid places, 10 left -> 1 bust from the money
  });
  it('is false with more than one elimination to go', () => {
    expect(isBubble(11, 9)).toBe(false);
  });
  it('is false once already in the money', () => {
    expect(isBubble(9, 9)).toBe(false);
  });
});

describe('allTablesAtBarrier', () => {
  it('is false while any table is still mid-hand', () => {
    expect(allTablesAtBarrier({ 1: 'waiting', 2: 'live', 3: 'waiting' })).toBe(false);
  });
  it('is true once every table has finished its hand', () => {
    expect(allTablesAtBarrier({ 1: 'waiting', 2: 'waiting', 3: 'empty' })).toBe(true);
  });
});

describe('tablesReadyToStart', () => {
  it('normal play: any waiting table may start independently', () => {
    const phases = { 1: 'waiting' as const, 2: 'live' as const, 3: 'waiting' as const };
    expect(tablesReadyToStart(phases, false).sort()).toEqual([1, 3]);
  });

  it('hand-for-hand: no table starts until every table is waiting', () => {
    const phases = { 1: 'waiting' as const, 2: 'live' as const, 3: 'waiting' as const };
    expect(tablesReadyToStart(phases, true)).toEqual([]);
  });

  it('hand-for-hand: all waiting tables start together once the barrier is reached', () => {
    const phases = { 1: 'waiting' as const, 2: 'waiting' as const, 3: 'empty' as const };
    expect(tablesReadyToStart(phases, true).sort()).toEqual([1, 2]);
  });
});
