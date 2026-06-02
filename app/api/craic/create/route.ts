import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createGame, toClientState } from '@/lib/poker/engine';
import { CraicGameConfig, BLIND_PRESETS, CraicGameInfo, getPayoutStructure } from '@/lib/craic/types';
import { GameConfig } from '@/lib/poker/types';

const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      host,
      gameName = '',
      description = '',
      buyInToken = '',
      buyInAmount = '0',
      protocolFeeBps = 100,
      entryMode = 'open',
      whitelist,
      startingStack = 1500,
      blindSpeed = 'standard',
      gameHash,
    } = body;

    if (!host) {
      return NextResponse.json({ error: 'Missing host address' }, { status: 400 });
    }

    if (protocolFeeBps < 100 || protocolFeeBps > 500) {
      return NextResponse.json({ error: 'protocolFeeBps must be between 100 and 500' }, { status: 400 });
    }

    const gameId = body.gameId || `craic_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const blindLevels = BLIND_PRESETS[blindSpeed as keyof typeof BLIND_PRESETS] || BLIND_PRESETS.standard;
    const payoutStructure = getPayoutStructure(6);

    const gameConfig: GameConfig = {
      maxPlayers: 6,
      startingChips: startingStack,
      actionTimeout: 30,
      blindLevels,
      payoutStructure,
    };

    const gameState = createGame(gameId, gameConfig);

    const craicConfig: CraicGameConfig = {
      gameId,
      gameName: gameName || gameId,
      ...(description ? { description } : {}),
      host,
      buyInToken,
      buyInAmount,
      protocolFeeBps,
      entryMode,
      ...(entryMode === 'leaderboard' && whitelist ? { whitelist } : {}),
      blindSpeed: blindSpeed as 'turbo' | 'standard' | 'deep',
      startingStack,
      maxPlayersPerTable: 6,
      createdAt: Date.now(),
      status: 'waiting',
      ...(gameHash ? { gameHash } : {}),
    };

    await redis.set(`craic:game:${gameId}:state`, JSON.stringify(gameState));
    await redis.set(`craic:game:${gameId}:config`, JSON.stringify(craicConfig));

    const gameInfo: CraicGameInfo = {
      gameId,
      gameName: gameName || gameId,
      host,
      buyInToken,
      buyInAmount,
      playerCount: 0,
      maxPlayersPerTable: 6,
      status: 'waiting',
      blindSpeed: blindSpeed as 'turbo' | 'standard' | 'deep',
      startingStack,
      entryMode,
      createdAt: Date.now(),
    };

    await redis.zadd('craic:lobby', { score: Date.now(), member: JSON.stringify(gameInfo) });
    await redis.sadd(`craic:player:${host}:games`, gameId);

    return NextResponse.json({
      success: true,
      gameId,
      config: craicConfig,
      gameState: toClientState(gameState, null),
    });
  } catch (error) {
    console.error('Error creating Craic game:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create game' },
      { status: 500 }
    );
  }
}
