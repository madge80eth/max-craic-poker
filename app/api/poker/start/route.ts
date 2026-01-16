import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { startGame, toClientState } from '@/lib/poker/engine';
import { GameState, TableInfo } from '@/lib/poker/types';

const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tableId, playerId } = body;

    if (!tableId || !playerId) {
      return NextResponse.json({ error: 'Missing tableId or playerId' }, { status: 400 });
    }

    // Get current game state
    const stateJson = await redis.get(`poker:table:${tableId}:state`);
    if (!stateJson) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    let gameState: GameState = typeof stateJson === 'string' ? JSON.parse(stateJson) : stateJson;

    // Verify player is at the table
    const player = gameState.players.find(p => p.odentity === playerId);
    if (!player) {
      return NextResponse.json({ error: 'Player not at this table' }, { status: 403 });
    }

    // Start the game
    gameState = startGame(gameState);

    // Save updated state
    await redis.set(`poker:table:${tableId}:state`, JSON.stringify(gameState));

    // Update lobby entry status
    const lobbyEntries = await redis.zrange('poker:lobby', 0, -1);
    for (const entry of lobbyEntries) {
      const tableInfo: TableInfo = typeof entry === 'string' ? JSON.parse(entry) : entry;
      if (tableInfo.tableId === tableId) {
        await redis.zrem('poker:lobby', JSON.stringify(tableInfo));
        const updatedInfo: TableInfo = { ...tableInfo, status: 'playing' };
        await redis.zadd('poker:lobby', { score: tableInfo.createdAt, member: JSON.stringify(updatedInfo) });
        break;
      }
    }

    return NextResponse.json({
      success: true,
      gameState: toClientState(gameState, playerId),
    });
  } catch (error) {
    console.error('Error starting poker game:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start game' },
      { status: 500 }
    );
  }
}
