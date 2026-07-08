// Persistence for per-table GameState — MTT-SPEC §9 (`table:{tid}:{n}`).
// Same injectable pattern as the other lib/mtt stores.

import { Redis } from '@upstash/redis';
import { GameState } from '@/lib/poker/types';

export interface TablesStore {
  getTable(tournamentId: string, tableNo: number): Promise<GameState | null>;
  setTable(tournamentId: string, tableNo: number, state: GameState): Promise<void>;
  setAllTables(tournamentId: string, tables: Record<number, GameState>): Promise<void>;
}

export class MemoryTablesStore implements TablesStore {
  private tables = new Map<string, GameState>();

  private key(tournamentId: string, tableNo: number) {
    return `${tournamentId}:${tableNo}`;
  }

  async getTable(tournamentId: string, tableNo: number) {
    return this.tables.get(this.key(tournamentId, tableNo)) ?? null;
  }

  async setTable(tournamentId: string, tableNo: number, state: GameState) {
    this.tables.set(this.key(tournamentId, tableNo), state);
  }

  async setAllTables(tournamentId: string, tables: Record<number, GameState>) {
    for (const [tableNo, state] of Object.entries(tables)) {
      await this.setTable(tournamentId, Number(tableNo), state);
    }
  }
}

const redis = Redis.fromEnv();

function tableKey(tournamentId: string, tableNo: number) {
  return `table:${tournamentId}:${tableNo}`;
}

export const redisTablesStore: TablesStore = {
  async getTable(tournamentId, tableNo) {
    const raw = await redis.get(tableKey(tournamentId, tableNo));
    if (!raw) return null;
    return (typeof raw === 'string' ? JSON.parse(raw) : raw) as GameState;
  },

  async setTable(tournamentId, tableNo, state) {
    await redis.set(tableKey(tournamentId, tableNo), JSON.stringify(state));
  },

  async setAllTables(tournamentId, tables) {
    await Promise.all(
      Object.entries(tables).map(([tableNo, state]) => redis.set(tableKey(tournamentId, Number(tableNo)), JSON.stringify(state)))
    );
  },
};
