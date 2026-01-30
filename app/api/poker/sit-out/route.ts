import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { toClientState } from '@/lib/poker/engine';
import { GameState } from '@/lib/poker/types';

const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tableId, playerId, sitOut } = body;

    if (!tableId || !playerId || sitOut === undefined) {
      return NextResponse.json(
        { error: 'Missing tableId, playerId, or sitOut' },
        { status: 400 }
      );
    }

    const stateJson = await redis.get(`poker:table:${tableId}:state`);
    if (!stateJson) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    const gameState: GameState = typeof stateJson === 'string' ? JSON.parse(stateJson) : stateJson;

    const player = gameState.players.find(p => p.odentity === playerId);
    if (!player) {
      return NextResponse.json({ error: 'Player not at table' }, { status: 400 });
    }

    player.sitOut = !!sitOut;
    if (!sitOut) {
      // Coming back — reset timeout counter
      player.consecutiveTimeouts = 0;
    }

    await redis.set(`poker:table:${tableId}:state`, JSON.stringify(gameState));

    return NextResponse.json({
      success: true,
      gameState: toClientState(gameState, playerId),
    });
  } catch (error) {
    console.error('Error toggling sit-out:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to toggle sit-out' },
      { status: 500 }
    );
  }
}
