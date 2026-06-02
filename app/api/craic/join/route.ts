import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { addPlayer, toClientState } from '@/lib/poker/engine';
import { GameState } from '@/lib/poker/types';
import { CraicGameConfig, CraicGameInfo } from '@/lib/craic/types';

const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId, playerId, playerName, seatIndex } = body;

    if (!gameId || !playerId || !playerName || seatIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing gameId, playerId, playerName, or seatIndex' },
        { status: 400 }
      );
    }

    const configJson = await redis.get(`craic:game:${gameId}:config`);
    if (!configJson) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    const config: CraicGameConfig = typeof configJson === 'string' ? JSON.parse(configJson) : configJson;

    const stateJson = await redis.get(`craic:game:${gameId}:state`);
    if (!stateJson) {
      return NextResponse.json({ error: 'Game state not found' }, { status: 404 });
    }
    let gameState: GameState = typeof stateJson === 'string' ? JSON.parse(stateJson) : stateJson;

    if (gameState.phase !== 'waiting') {
      return NextResponse.json({ error: 'Game already started' }, { status: 400 });
    }

    const existingPlayer = gameState.players.find(p => p.odentity === playerId);
    if (existingPlayer) {
      return NextResponse.json({ error: 'Player already in game' }, { status: 400 });
    }

    if (gameState.players.length >= config.maxPlayersPerTable) {
      return NextResponse.json({ error: 'Game is full' }, { status: 400 });
    }

    // Entry mode check
    if (config.entryMode === 'leaderboard' && config.whitelist) {
      const allowed = config.whitelist.map(a => a.toLowerCase());
      if (!allowed.includes(playerId.toLowerCase())) {
        return NextResponse.json({ error: 'Not on the whitelist' }, { status: 403 });
      }
    }

    gameState = addPlayer(gameState, playerId, playerName, seatIndex);

    await redis.set(`craic:game:${gameId}:state`, JSON.stringify(gameState));

    // Update lobby entry
    const lobbyEntries = await redis.zrange('craic:lobby', 0, -1);
    for (const entry of lobbyEntries) {
      const gameInfo: CraicGameInfo = typeof entry === 'string' ? JSON.parse(entry) : entry;
      if (gameInfo.gameId === gameId) {
        await redis.zrem('craic:lobby', JSON.stringify(gameInfo));
        const updatedInfo: CraicGameInfo = {
          ...gameInfo,
          playerCount: gameState.players.length,
        };
        await redis.zadd('craic:lobby', { score: gameInfo.createdAt, member: JSON.stringify(updatedInfo) });
        break;
      }
    }

    await redis.sadd(`craic:player:${playerId}:games`, gameId);

    return NextResponse.json({
      success: true,
      gameState: toClientState(gameState, playerId),
    });
  } catch (error) {
    console.error('Error joining Craic game:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to join game' },
      { status: 500 }
    );
  }
}
