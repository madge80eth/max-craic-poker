import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { toClientState } from '@/lib/poker/engine';
import { GameState } from '@/lib/poker/types';
import { CraicGameConfig, CraicGameStatus } from '@/lib/craic/types';

const redis = Redis.fromEnv();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');
    const playerId = searchParams.get('playerId');

    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
    }

    // Get game config
    const configJson = await redis.get(`craic:game:${gameId}:config`);
    if (!configJson) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    const config: CraicGameConfig = typeof configJson === 'string' ? JSON.parse(configJson) : configJson;

    // Get current game state
    const stateJson = await redis.get(`craic:game:${gameId}:state`);
    if (!stateJson) {
      return NextResponse.json({ error: 'Game state not found' }, { status: 404 });
    }
    const gameState: GameState = typeof stateJson === 'string' ? JSON.parse(stateJson) : stateJson;

    // Determine status
    let status: CraicGameStatus = 'waiting';
    if (gameState.phase === 'finished') {
      status = 'finished';
    } else if (gameState.phase !== 'waiting') {
      status = 'active';
    }

    // Get player list for lobby display
    const players = gameState.players.map(p => ({
      address: p.odentity,
      name: p.name,
      seatIndex: p.seatIndex,
      chips: p.chips,
    }));

    return NextResponse.json({
      success: true,
      config,
      status,
      players,
      gameState: toClientState(gameState, playerId || null),
    });
  } catch (error) {
    console.error('Error getting Craic game state:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get state' },
      { status: 500 }
    );
  }
}

// Also support POST for getting state (useful for including auth data)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId, playerId } = body;

    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
    }

    // Reuse GET logic
    const url = new URL(request.url);
    url.searchParams.set('gameId', gameId);
    if (playerId) url.searchParams.set('playerId', playerId);

    const newRequest = new Request(url.toString(), { method: 'GET' });
    return GET(newRequest);
  } catch (error) {
    console.error('Error in POST state:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get state' },
      { status: 500 }
    );
  }
}
