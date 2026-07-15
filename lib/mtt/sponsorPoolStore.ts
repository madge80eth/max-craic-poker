// Persistence for the mock sponsor pool (mockEscrow.ts) — same injectable
// Memory/Redis pattern as tablesStore.ts/tournamentStore.ts, key
// `sponsorpool:{gameId}`.

import { Redis } from '@upstash/redis';
import { SponsorPool, SponsorPoolStore } from './mockEscrow';

const redis = Redis.fromEnv();

function poolKey(gameId: string) {
  return `sponsorpool:${gameId}`;
}

export const redisSponsorPoolStore: SponsorPoolStore = {
  async getPool(gameId) {
    const raw = await redis.get(poolKey(gameId));
    if (!raw) return null;
    return (typeof raw === 'string' ? JSON.parse(raw) : raw) as SponsorPool;
  },

  async setPool(gameId, pool) {
    await redis.set(poolKey(gameId), JSON.stringify(pool));
  },
};
