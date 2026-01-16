import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { toClientState } from '@/lib/poker/engine';
import { GameState } from '@/lib/poker/types';

const redis = Redis.fromEnv();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tableId = searchParams.get('tableId');
    const playerId = searchParams.get('playerId');

    if (!tableId) {
      return NextResponse.json({ error: 'Missing tableId' }, { status: 400 });
    }

    // Get current game state
    const stateJson = await redis.get(`poker:table:${tableId}:state`);
    if (!stateJson) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    const gameState: GameState = typeof stateJson === 'string' ? JSON.parse(stateJson) : stateJson;

    return NextResponse.json({
      success: true,
      gameState: toClientState(gameState, playerId || null),
    });
  } catch (error) {
    console.error('Error getting poker state:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get state' },
      { status: 500 }
    );
  }
}
