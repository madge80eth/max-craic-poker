// Redis-backed Store — production adapter, same Upstash client pattern used
// throughout the existing craic routes (Redis.fromEnv()).

import { Redis } from '@upstash/redis';
import { Address, GameRecord, RegistrationRecord } from './types';
import { Store } from './store';

const redis = Redis.fromEnv();

function gameKey(gameId: string) {
  return `game:${gameId}`;
}
function regKey(gameId: string, wallet: Address) {
  return `reg:${gameId}:${wallet.toLowerCase()}`;
}
function entrantsKey(gameId: string) {
  return `game:${gameId}:entrants`;
}
function eventsKey(gameId: string) {
  return `events:${gameId}`;
}

export const redisStore: Store = {
  async createGame(gameId, config) {
    const record: GameRecord = { gameId, config, status: 'registering', createdAt: Date.now() };
    await redis.set(gameKey(gameId), JSON.stringify(record));
    return record;
  },

  async getGame(gameId) {
    const raw = await redis.get(gameKey(gameId));
    if (!raw) return null;
    return (typeof raw === 'string' ? JSON.parse(raw) : raw) as GameRecord;
  },

  async getRegistration(gameId, wallet) {
    const raw = await redis.get(regKey(gameId, wallet));
    if (!raw) return null;
    return (typeof raw === 'string' ? JSON.parse(raw) : raw) as RegistrationRecord;
  },

  async setRegistration(gameId, wallet, record) {
    await redis.set(regKey(gameId, wallet), JSON.stringify(record));
  },

  async addEntrant(gameId, wallet) {
    await redis.sadd(entrantsKey(gameId), wallet.toLowerCase());
  },

  async removeEntrant(gameId, wallet) {
    await redis.srem(entrantsKey(gameId), wallet.toLowerCase());
  },

  async listEntrants(gameId) {
    const members = await redis.smembers(entrantsKey(gameId));
    return members as Address[];
  },

  async appendEvent(gameId, event) {
    await redis.rpush(eventsKey(gameId), JSON.stringify(event));
  },
};
