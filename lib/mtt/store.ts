// Storage interface for the registration server (GAME-CREATION-SPEC §7).
// registration.ts depends only on this interface so it can be tested with
// MemoryStore; production wires RedisStore.

import { Address, GameConfig, GameRecord } from './types';
import { RegistrationRecord } from './types';
import { GameEvent } from './events';

export interface Store {
  createGame(gameId: string, config: GameConfig): Promise<GameRecord>;
  getGame(gameId: string): Promise<GameRecord | null>;
  getRegistration(gameId: string, wallet: Address): Promise<RegistrationRecord | null>;
  setRegistration(gameId: string, wallet: Address, record: RegistrationRecord): Promise<void>;
  addEntrant(gameId: string, wallet: Address): Promise<void>;
  removeEntrant(gameId: string, wallet: Address): Promise<void>;
  listEntrants(gameId: string): Promise<Address[]>;
  appendEvent(gameId: string, event: GameEvent): Promise<void>;
}

export class MemoryStore implements Store {
  games = new Map<string, GameRecord>();
  registrations = new Map<string, RegistrationRecord>();
  entrants = new Map<string, Set<Address>>();
  events = new Map<string, GameEvent[]>();

  async createGame(gameId: string, config: GameConfig) {
    const record: GameRecord = { gameId, config, status: 'registering', createdAt: Date.now() };
    this.games.set(gameId, record);
    return record;
  }

  async getGame(gameId: string) {
    return this.games.get(gameId) ?? null;
  }

  private key(gameId: string, wallet: Address) {
    return `${gameId}:${wallet.toLowerCase()}`;
  }

  async getRegistration(gameId: string, wallet: Address) {
    return this.registrations.get(this.key(gameId, wallet)) ?? null;
  }

  async setRegistration(gameId: string, wallet: Address, record: RegistrationRecord) {
    this.registrations.set(this.key(gameId, wallet), record);
  }

  async addEntrant(gameId: string, wallet: Address) {
    if (!this.entrants.has(gameId)) this.entrants.set(gameId, new Set());
    this.entrants.get(gameId)!.add(wallet.toLowerCase() as Address);
  }

  async removeEntrant(gameId: string, wallet: Address) {
    this.entrants.get(gameId)?.delete(wallet.toLowerCase() as Address);
  }

  async listEntrants(gameId: string) {
    return Array.from(this.entrants.get(gameId) ?? []);
  }

  async appendEvent(gameId: string, event: GameEvent) {
    if (!this.events.has(gameId)) this.events.set(gameId, []);
    this.events.get(gameId)!.push(event);
  }
}
