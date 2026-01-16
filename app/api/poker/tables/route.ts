import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { TableInfo } from '@/lib/poker/types';

const redis = Redis.fromEnv();

export async function GET() {
  try {
    // Get all tables from lobby (sorted by creation time, newest first)
    const entries = await redis.zrange('poker:lobby', 0, -1, { rev: true });

    const tables: TableInfo[] = entries.map(entry => {
      return typeof entry === 'string' ? JSON.parse(entry) : entry;
    });

    // Filter out finished tables older than 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const activeTables = tables.filter(t =>
      t.status !== 'finished' || t.createdAt > fiveMinutesAgo
    );

    return NextResponse.json({
      success: true,
      tables: activeTables,
    });
  } catch (error) {
    console.error('Error getting poker tables:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get tables' },
      { status: 500 }
    );
  }
}
