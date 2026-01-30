import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createGame, addPlayer, toClientState } from '@/lib/poker/engine';
import { TableInfo, DEFAULT_CONFIG, SybilResistanceConfig, buildBlindLevels, GameConfig } from '@/lib/poker/types';

const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      creatorId,
      creatorName,
      tableName,
      scheduledStartTime,
      startingChips,
      blindIntervalMinutes,
      sybilResistance,
    } = body;

    if (!creatorId || !creatorName) {
      return NextResponse.json({ error: 'Missing creatorId or creatorName' }, { status: 400 });
    }

    // Generate table and tournament IDs
    const tableId = `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tournamentId = `mtt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Build game config from custom settings or use defaults
    const chips = startingChips || DEFAULT_CONFIG.startingChips;
    const interval = blindIntervalMinutes || 3;
    const gameConfig: GameConfig = {
      ...DEFAULT_CONFIG,
      startingChips: chips,
      blindLevels: (startingChips || blindIntervalMinutes)
        ? buildBlindLevels(chips, interval)
        : DEFAULT_CONFIG.blindLevels,
    };

    // Create game state with custom config
    let gameState = createGame(tableId, gameConfig);

    // Add creator as first player (seat 0)
    gameState = addPlayer(gameState, creatorId, creatorName, 0);

    // Store game state in Redis
    await redis.set(`poker:table:${tableId}:state`, JSON.stringify(gameState));

    // Store sybil resistance config separately for join-time enforcement
    const sybilConfig: SybilResistanceConfig | undefined = sybilResistance;
    if (sybilConfig) {
      await redis.set(`poker:table:${tableId}:sybil`, JSON.stringify(sybilConfig));
    }

    // Add to lobby
    const tableInfo: TableInfo = {
      tableId,
      name: tableName || `${creatorName}'s Table`,
      playerCount: 1,
      maxPlayers: gameConfig.maxPlayers,
      blinds: `${gameConfig.blindLevels[0].smallBlind}/${gameConfig.blindLevels[0].bigBlind}`,
      status: 'waiting',
      createdAt: Date.now(),
      creatorId,
      tournamentId,
      tableNumber: 1,
      startingChips: chips,
      blindIntervalMinutes: interval,
      ...(scheduledStartTime ? { scheduledStartTime } : {}),
      ...(sybilConfig ? { sybilResistance: sybilConfig } : {}),
    };

    await redis.zadd('poker:lobby', { score: Date.now(), member: JSON.stringify(tableInfo) });

    // Track player's table
    await redis.sadd(`poker:player:${creatorId}:tables`, tableId);

    return NextResponse.json({
      success: true,
      tableId,
      tournamentId,
      gameState: toClientState(gameState, creatorId),
    });
  } catch (error) {
    console.error('Error creating poker table:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create table' },
      { status: 500 }
    );
  }
}
