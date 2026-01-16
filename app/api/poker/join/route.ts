import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { addPlayer, toClientState } from '@/lib/poker/engine';
import { GameState, TableInfo } from '@/lib/poker/types';

const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tableId, playerId, playerName, seatIndex } = body;

    if (!tableId || !playerId || !playerName || seatIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing tableId, playerId, playerName, or seatIndex' },
        { status: 400 }
      );
    }

    // Get current game state
    const stateJson = await redis.get(`poker:table:${tableId}:state`);
    if (!stateJson) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    let gameState: GameState = typeof stateJson === 'string' ? JSON.parse(stateJson) : stateJson;

    // Add player
    gameState = addPlayer(gameState, playerId, playerName, seatIndex);

    // Save updated state
    await redis.set(`poker:table:${tableId}:state`, JSON.stringify(gameState));

    // Update lobby entry
    const lobbyEntries = await redis.zrange('poker:lobby', 0, -1);
    for (const entry of lobbyEntries) {
      const tableInfo: TableInfo = typeof entry === 'string' ? JSON.parse(entry) : entry;
      if (tableInfo.tableId === tableId) {
        // Remove old entry
        await redis.zrem('poker:lobby', JSON.stringify(tableInfo));
        // Add updated entry
        const updatedInfo: TableInfo = {
          ...tableInfo,
          playerCount: gameState.players.length,
        };
        await redis.zadd('poker:lobby', { score: tableInfo.createdAt, member: JSON.stringify(updatedInfo) });
        break;
      }
    }

    // Track player's table
    await redis.sadd(`poker:player:${playerId}:tables`, tableId);

    return NextResponse.json({
      success: true,
      gameState: toClientState(gameState, playerId),
    });
  } catch (error) {
    console.error('Error joining poker table:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to join table' },
      { status: 500 }
    );
  }
}
