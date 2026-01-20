import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createGame, toClientState } from '@/lib/poker/engine';
import { CraicGameConfig, BLIND_PRESETS, CraicGameInfo } from '@/lib/craic/types';
import { GameConfig } from '@/lib/poker/types';

const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      host,
      prizePool,
      bondAmount = 0,
      maxPlayers = 6,
      startingStack = 1500,
      blindSpeed = 'standard',
      sybilOptions = {
        nftGating: { enabled: false },
        bondMechanic: { enabled: false },
        coinbaseVerification: { enabled: false },
      },
    } = body;

    if (!host) {
      return NextResponse.json({ error: 'Missing host address' }, { status: 400 });
    }

    if (!prizePool || prizePool < 0) {
      return NextResponse.json({ error: 'Invalid prize pool' }, { status: 400 });
    }

    // Generate game ID
    const gameId = `craic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get blind levels based on speed
    const blindLevels = BLIND_PRESETS[blindSpeed as keyof typeof BLIND_PRESETS] || BLIND_PRESETS.standard;

    // Create poker game config
    const gameConfig: GameConfig = {
      maxPlayers: 6,
      startingChips: startingStack,
      actionTimeout: 30, // 30 seconds per action
      blindLevels,
      payoutStructure: [65, 35], // Top 2 payout
    };

    // Create game state using existing engine
    const gameState = createGame(gameId, gameConfig);

    // Create Craic-specific config
    const craicConfig: CraicGameConfig = {
      gameId,
      host,
      prizePool,
      bondAmount,
      maxPlayers,
      startingStack,
      blindSpeed: blindSpeed as 'turbo' | 'standard' | 'deep',
      sybilOptions,
      createdAt: Date.now(),
    };

    // Store game state and config in Redis
    await redis.set(`craic:game:${gameId}:state`, JSON.stringify(gameState));
    await redis.set(`craic:game:${gameId}:config`, JSON.stringify(craicConfig));

    // Add to Craic lobby
    const gameInfo: CraicGameInfo = {
      gameId,
      host,
      prizePool,
      bondAmount,
      playerCount: 0,
      maxPlayers,
      status: 'waiting',
      blindSpeed: blindSpeed as 'turbo' | 'standard' | 'deep',
      startingStack,
      sybilOptions,
      createdAt: Date.now(),
    };

    await redis.zadd('craic:lobby', { score: Date.now(), member: JSON.stringify(gameInfo) });

    // Track host's games
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
