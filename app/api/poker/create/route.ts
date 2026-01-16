import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createGame, addPlayer, toClientState } from '@/lib/poker/engine';
import { TableInfo, DEFAULT_CONFIG } from '@/lib/poker/types';

const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { creatorId, creatorName, tableName } = body;

    if (!creatorId || !creatorName) {
      return NextResponse.json({ error: 'Missing creatorId or creatorName' }, { status: 400 });
    }

    // Generate table ID
    const tableId = `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create game state
    let gameState = createGame(tableId, DEFAULT_CONFIG);

    // Add creator as first player (seat 0)
    gameState = addPlayer(gameState, creatorId, creatorName, 0);

    // Store game state in Redis
    await redis.set(`poker:table:${tableId}:state`, JSON.stringify(gameState));

    // Add to lobby
    const tableInfo: TableInfo = {
      tableId,
      name: tableName || `${creatorName}'s Table`,
      playerCount: 1,
      maxPlayers: DEFAULT_CONFIG.maxPlayers,
      blinds: `${DEFAULT_CONFIG.blindLevels[0].smallBlind}/${DEFAULT_CONFIG.blindLevels[0].bigBlind}`,
      status: 'waiting',
      createdAt: Date.now(),
      creatorId,
    };

    await redis.zadd('poker:lobby', { score: Date.now(), member: JSON.stringify(tableInfo) });

    // Track player's table
    await redis.sadd(`poker:player:${creatorId}:tables`, tableId);

    return NextResponse.json({
      success: true,
      tableId,
      gameState: toClientState(gameState, creatorId),
    });
  } catch (error) {
    console.error('Error creating poker table:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create table' },
      { status: 500 }
    );
  }
}
