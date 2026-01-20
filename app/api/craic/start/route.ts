import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { startGame, toClientState } from '@/lib/poker/engine';
import { GameState } from '@/lib/poker/types';
import { CraicGameConfig, CraicGameInfo } from '@/lib/craic/types';

const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId, playerId } = body;

    if (!gameId || !playerId) {
      return NextResponse.json({ error: 'Missing gameId or playerId' }, { status: 400 });
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

    let gameState: GameState = typeof stateJson === 'string' ? JSON.parse(stateJson) : stateJson;

    // Verify player is in the game
    const player = gameState.players.find(p => p.odentity === playerId);
    if (!player) {
      return NextResponse.json({ error: 'Player not in this game' }, { status: 403 });
    }

    // Check if game already started
    if (gameState.phase !== 'waiting') {
      return NextResponse.json({ error: 'Game already started' }, { status: 400 });
    }

    // Need at least 2 players
    if (gameState.players.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 players to start' }, { status: 400 });
    }

    // Start the game
    gameState = startGame(gameState);

    // Save updated state
    await redis.set(`craic:game:${gameId}:state`, JSON.stringify(gameState));

    // Update lobby entry status
    const lobbyEntries = await redis.zrange('craic:lobby', 0, -1);
    for (const entry of lobbyEntries) {
      const gameInfo: CraicGameInfo = typeof entry === 'string' ? JSON.parse(entry) : entry;
      if (gameInfo.gameId === gameId) {
        await redis.zrem('craic:lobby', JSON.stringify(gameInfo));
        const updatedInfo: CraicGameInfo = { ...gameInfo, status: 'active' };
        await redis.zadd('craic:lobby', { score: gameInfo.createdAt, member: JSON.stringify(updatedInfo) });
        break;
      }
    }

    return NextResponse.json({
      success: true,
      gameState: toClientState(gameState, playerId),
    });
  } catch (error) {
    console.error('Error starting Craic game:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start game' },
      { status: 500 }
    );
  }
}
