import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { processAction, toClientState, startHand } from '@/lib/poker/engine';
import { GameState, GameAction } from '@/lib/poker/types';

const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tableId, playerId, action, amount } = body;

    if (!tableId || !playerId || !action) {
      return NextResponse.json({ error: 'Missing tableId, playerId, or action' }, { status: 400 });
    }

    // Get current game state
    const stateJson = await redis.get(`poker:table:${tableId}:state`);
    if (!stateJson) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    let gameState: GameState = typeof stateJson === 'string' ? JSON.parse(stateJson) : stateJson;

    // Validate game is in progress
    if (gameState.phase === 'waiting' || gameState.phase === 'finished') {
      return NextResponse.json({ error: 'Game not in progress' }, { status: 400 });
    }

    // Process the action
    const gameAction: GameAction = {
      type: action,
      amount: amount,
      playerId,
    };

    gameState = await processAction(gameState, gameAction);

    // If showdown completed, check if we should start next hand automatically
    // (In a real app, you'd have a delay here for animations)
    if (gameState.phase === 'showdown') {
      // For now, we'll let the client trigger next hand
      // In future, could auto-advance after delay
    }

    // Save updated state
    await redis.set(`poker:table:${tableId}:state`, JSON.stringify(gameState));

    return NextResponse.json({
      success: true,
      gameState: toClientState(gameState, playerId),
    });
  } catch (error) {
    console.error('Error processing poker action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process action' },
      { status: 500 }
    );
  }
}
