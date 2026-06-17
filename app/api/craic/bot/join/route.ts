// DEV ONLY — remove before production
import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { addPlayer, toClientState } from '@/lib/poker/engine';
import { GameState } from '@/lib/poker/types';

const redis = Redis.fromEnv();

export async function POST(request: Request) {
  // DEV ONLY — remove before production
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const { gameId, requesterId } = await request.json();

    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
    }

    const stateJson = await redis.get(`craic:game:${gameId}:state`);
    if (!stateJson) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    let gameState: GameState = typeof stateJson === 'string' ? JSON.parse(stateJson) : stateJson;

    if (gameState.phase !== 'waiting') {
      return NextResponse.json({ error: 'Game already started' }, { status: 400 });
    }

    const botId = `bot_ghost_${gameId}`;

    // Guard: bot already joined
    if (gameState.players.some(p => p.odentity === botId)) {
      return NextResponse.json({ success: true, gameState: toClientState(gameState, requesterId || null) });
    }

    // Find first free seat (prefer seat 1, opposite host at seat 0)
    const occupiedSeats = new Set(gameState.players.map(p => p.seatIndex));
    let botSeat = 1;
    if (occupiedSeats.has(botSeat)) {
      for (let i = 2; i < 6; i++) {
        if (!occupiedSeats.has(i)) { botSeat = i; break; }
      }
    }

    gameState = addPlayer(gameState, botId, 'Ghost', botSeat);

    gameState = {
      ...gameState,
      players: gameState.players.map(p =>
        p.odentity === botId ? { ...p, isBot: true } : p
      ),
    };

    await redis.set(`craic:game:${gameId}:state`, JSON.stringify(gameState));

    return NextResponse.json({
      success: true,
      gameState: toClientState(gameState, requesterId || null),
    });
  } catch (error) {
    console.error('[craic/bot/join]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add bot' },
      { status: 500 }
    );
  }
}
