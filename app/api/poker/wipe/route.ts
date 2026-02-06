import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function POST() {
  try {
    // Get all table keys
    const lobbyEntries = await redis.zrange('poker:lobby', 0, -1);

    // Delete all lobby entries
    if (lobbyEntries.length > 0) {
      await redis.del('poker:lobby');
    }

    // Find and delete all poker table state keys
    let cursor = '0';
    const keysToDelete: string[] = [];
    do {
      const result = await redis.scan(cursor, { match: 'poker:table:*', count: 100 });
      cursor = String(result[0]);
      keysToDelete.push(...(result[1] as string[]));
    } while (cursor !== '0');

    // Also find player tracking keys
    let cursor2 = '0';
    do {
      const result = await redis.scan(cursor2, { match: 'poker:player:*', count: 100 });
      cursor2 = String(result[0]);
      keysToDelete.push(...(result[1] as string[]));
    } while (cursor2 !== '0');

    // Also find sponsored tournament keys
    let cursor3 = '0';
    do {
      const result = await redis.scan(cursor3, { match: 'poker:sponsored:*', count: 100 });
      cursor3 = String(result[0]);
      keysToDelete.push(...(result[1] as string[]));
    } while (cursor3 !== '0');

    // Delete sponsored:all set
    await redis.del('poker:sponsored:all');

    // Delete all found keys
    if (keysToDelete.length > 0) {
      // Delete in batches of 50
      for (let i = 0; i < keysToDelete.length; i += 50) {
        const batch = keysToDelete.slice(i, i + 50);
        await Promise.all(batch.map(key => redis.del(key)));
      }
    }

    return NextResponse.json({
      success: true,
      message: `Wiped ${lobbyEntries.length} lobby entries and ${keysToDelete.length} keys`,
    });
  } catch (error) {
    console.error('Error wiping poker data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to wipe data' },
      { status: 500 }
    );
  }
}
