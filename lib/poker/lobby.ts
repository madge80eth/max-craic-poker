// Shared helper for updating poker lobby entries in Redis
import { Redis } from '@upstash/redis';
import { TableInfo } from './types';

export async function updateLobbyStatus(
  redis: Redis,
  tableId: string,
  updates: Partial<TableInfo>
): Promise<void> {
  try {
    const lobbyEntries = await redis.zrange('poker:lobby', 0, -1);
    for (const entry of lobbyEntries) {
      const tableInfo: TableInfo = typeof entry === 'string' ? JSON.parse(entry) : entry;
      if (tableInfo.tableId === tableId) {
        await redis.zrem('poker:lobby', typeof entry === 'string' ? entry : JSON.stringify(entry));
        const updatedInfo: TableInfo = { ...tableInfo, ...updates };
        await redis.zadd('poker:lobby', { score: tableInfo.createdAt, member: JSON.stringify(updatedInfo) });
        break;
      }
    }
  } catch (error) {
    console.error('Failed to update lobby status:', error);
  }
}
