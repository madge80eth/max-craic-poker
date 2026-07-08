import { describe, expect, it } from 'vitest';
import { processAction } from '@/lib/poker/engine';
import { GameState } from '@/lib/poker/types';
import { blindLevelFor } from './blinds';
import { advanceTableHand, initTableFromDraw } from './tableEngine';
import { TableAssignment } from './tournament';

function sixSeatAssignment(): TableAssignment {
  return {
    tableNo: 1,
    seats: Array.from({ length: 6 }, (_, i) => `0xplayer${i}`),
  };
}

/** Folds every player except the last active one, driving the hand to showdown. */
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

describe('initTableFromDraw', () => {
  it('seats every entrant at their assigned seat with the current blind level', () => {
    const level1 = blindLevelFor(1, 4);
    const state = initTableFromDraw('t1:1', sixSeatAssignment(), 10000, level1);

    expect(state.players).toHaveLength(6);
    for (let i = 0; i < 6; i++) {
      expect(state.players.find((p) => p.seatIndex === i)?.odentity).toBe(`0xplayer${i}`);
    }
    expect(state.config.blindLevels[0]).toEqual({ level: 1, smallBlind: 50, bigBlind: 100, ante: 0, duration: 0 });
    expect(state.phase).toBe('preflop'); // startGame() dealt the first hand
    expect(state.handNumber).toBe(1);
  });

  it('handles a short-handed table (fewer than 6 seated)', () => {
    const level1 = blindLevelFor(1, 4);
    const assignment: TableAssignment = { tableNo: 2, seats: ['0xa', '0xb', '0xc', null, null, null] };
    const state = initTableFromDraw('t1:2', assignment, 10000, level1);
    expect(state.players).toHaveLength(3);
  });
});

describe('advanceTableHand', () => {
  it('deals the next hand using an updated global blind level', () => {
    const level1 = blindLevelFor(1, 4);
    let state = initTableFromDraw('t1:1', sixSeatAssignment(), 10000, level1);
    state = foldToShowdown(state);
    expect(state.phase).toBe('showdown');

    const level5 = blindLevelFor(5, 4); // includes an ante
    const next = advanceTableHand(state, level5);

    expect(next.phase).toBe('preflop');
    expect(next.handNumber).toBe(state.handNumber + 1);
    expect(next.config.blindLevels[0]).toEqual({ level: 5, smallBlind: 200, bigBlind: 400, ante: 400, duration: 0 });
    // antes should actually be posted this hand
    const totalAntesAndBlinds = next.players.reduce((sum, p) => sum + p.bet, 0);
    expect(totalAntesAndBlinds).toBeGreaterThan(0);
  });

  it('refuses to advance a table that is not at showdown', () => {
    const level1 = blindLevelFor(1, 4);
    const state = initTableFromDraw('t1:1', sixSeatAssignment(), 10000, level1);
    expect(state.phase).toBe('preflop');
    expect(() => advanceTableHand(state, level1)).toThrow();
  });
});
