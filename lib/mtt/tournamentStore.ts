// Persistence for TournamentState — MTT-SPEC §9 (`tournament:{id}`).
// Same injectable-Store pattern as lib/mtt/store.ts: MemoryTournamentStore for
// tests, RedisTournamentStore for production.

import { Redis } from '@upstash/redis';
import { TournamentState } from './tournament';

export interface TournamentStore {
  get(tournamentId: string): Promise<TournamentState | null>;
  set(tournamentId: string, state: TournamentState): Promise<void>;
}

export class MemoryTournamentStore implements TournamentStore {
  private states = new Map<string, TournamentState>();

  async get(tournamentId: string) {
    return this.states.get(tournamentId) ?? null;
  }

  async set(tournamentId: string, state: TournamentState) {
    this.states.set(tournamentId, state);
  }
}

const redis = Redis.fromEnv();

function tournamentKey(tournamentId: string) {
  return `tournament:${tournamentId}`;
}

export const redisTournamentStore: TournamentStore = {
  async get(tournamentId) {
    const raw = await redis.get(tournamentKey(tournamentId));
    if (!raw) return null;
    return (typeof raw === 'string' ? JSON.parse(raw) : raw) as TournamentState;
  },

  async set(tournamentId, state) {
    await redis.set(tournamentKey(tournamentId), JSON.stringify(state));
  },
};
