import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { startHand, toClientState } from '@/lib/poker/engine';
import { GameState } from '@/lib/poker/types';
import { updateLobbyStatus } from '@/lib/poker/lobby';

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

    // Can only start next hand after showdown
    if (gameState.phase !== 'showdown') {
      return NextResponse.json({ error: 'Can only start next hand after showdown' }, { status: 400 });
    }

    // Verify player is at the table
    const player = gameState.players.find(p => p.odentity === playerId);
    if (!player) {
      return NextResponse.json({ error: 'Player not at this table' }, { status: 403 });
    }

    // Start next hand
    gameState = startHand(gameState);

    // Save updated state
    await redis.set(`poker:table:${tableId}:state`, JSON.stringify(gameState));

    // Update lobby status if game finished
    if (gameState.phase === 'finished') {
      await updateLobbyStatus(redis, tableId, {
        status: 'finished',
        playerCount: gameState.players.filter(p => !p.disconnected).length,
      });
    }

    return NextResponse.json({
      success: true,
      gameState: toClientState(gameState, playerId),
    });
  } catch (error) {
    console.error('Error starting next hand:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start next hand' },
      { status: 500 }
    );
  }
}
