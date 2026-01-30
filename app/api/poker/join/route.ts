import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { addPlayer, createGame, toClientState } from '@/lib/poker/engine';
import { GameState, TableInfo, DEFAULT_CONFIG, SybilResistanceConfig, hasSybilRequirements, buildBlindLevels } from '@/lib/poker/types';
import { checkAllSybilRequirements } from '@/lib/poker/sybil-checks';

const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tableId, playerId, playerName, seatIndex } = body;

    if (!tableId || !playerId || !playerName || seatIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing tableId, playerId, playerName, or seatIndex' },
        { status: 400 }
      );
    }

    // --- Sybil Resistance Enforcement ---
    const sybilJson = await redis.get(`poker:table:${tableId}:sybil`);
    if (sybilJson) {
      const sybilConfig: SybilResistanceConfig = typeof sybilJson === 'string'
        ? JSON.parse(sybilJson)
        : sybilJson as SybilResistanceConfig;

      if (hasSybilRequirements(sybilConfig)) {
        // Guest players cannot pass any wallet-based sybil check
        if (playerId.startsWith('guest_')) {
          return NextResponse.json({
            error: 'This table requires wallet verification. Please connect a wallet to join.',
            sybilFailed: true,
          }, { status: 403 });
        }

        const result = await checkAllSybilRequirements(playerId, sybilConfig);
        if (!result.passed) {
          return NextResponse.json({
            error: result.errors[0],
            sybilFailed: true,
            allErrors: result.errors,
          }, { status: 403 });
        }
      }
    }

    // --- Standard join logic ---
    const stateJson = await redis.get(`poker:table:${tableId}:state`);
    if (!stateJson) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    let gameState: GameState = typeof stateJson === 'string' ? JSON.parse(stateJson) : stateJson;

    // Check if table is full
    if (gameState.players.length >= gameState.config.maxPlayers) {
      // Table is full - find or create an overflow table in the same tournament
      const overflowResult = await findOrCreateOverflowTable(tableId, playerId, playerName);
      if (overflowResult) {
        return NextResponse.json(overflowResult);
      }
      return NextResponse.json({ error: 'Table is full' }, { status: 400 });
    }

    // Add player
    gameState = addPlayer(gameState, playerId, playerName, seatIndex);

    // Save updated state
    await redis.set(`poker:table:${tableId}:state`, JSON.stringify(gameState));

    // Update lobby entry
    await updateLobbyPlayerCount(tableId, gameState.players.length);

    // Track player's table
    await redis.sadd(`poker:player:${playerId}:tables`, tableId);

    return NextResponse.json({
      success: true,
      gameState: toClientState(gameState, playerId),
    });
  } catch (error) {
    console.error('Error joining poker table:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to join table' },
      { status: 500 }
    );
  }
}

async function updateLobbyPlayerCount(tableId: string, playerCount: number) {
  const lobbyEntries = await redis.zrange('poker:lobby', 0, -1);
  for (const entry of lobbyEntries) {
    const tableInfo: TableInfo = typeof entry === 'string' ? JSON.parse(entry) : entry;
    if (tableInfo.tableId === tableId) {
      await redis.zrem('poker:lobby', typeof entry === 'string' ? entry : JSON.stringify(entry));
      const updatedInfo: TableInfo = { ...tableInfo, playerCount };
      await redis.zadd('poker:lobby', { score: tableInfo.createdAt, member: JSON.stringify(updatedInfo) });
      break;
    }
  }
}

async function findOrCreateOverflowTable(
  originalTableId: string,
  playerId: string,
  playerName: string
): Promise<object | null> {
  // Find the tournament ID for the original table
  const lobbyEntries = await redis.zrange('poker:lobby', 0, -1);
  let originalTableInfo: TableInfo | null = null;

  for (const entry of lobbyEntries) {
    const info: TableInfo = typeof entry === 'string' ? JSON.parse(entry) : entry;
    if (info.tableId === originalTableId) {
      originalTableInfo = info;
      break;
    }
  }

  if (!originalTableInfo?.tournamentId) return null;

  const tournamentId = originalTableInfo.tournamentId;

  // Look for another table in the same tournament with space
  let maxTableNumber = 0;
  for (const entry of lobbyEntries) {
    const info: TableInfo = typeof entry === 'string' ? JSON.parse(entry) : entry;
    if (info.tournamentId === tournamentId) {
      maxTableNumber = Math.max(maxTableNumber, info.tableNumber || 1);
      if (info.playerCount < info.maxPlayers && info.status === 'waiting') {
        // Found a table with space
        const stateJson = await redis.get(`poker:table:${info.tableId}:state`);
        if (!stateJson) continue;
        let gameState: GameState = typeof stateJson === 'string' ? JSON.parse(stateJson) : stateJson;

        // Find first available seat
        const occupiedSeats = new Set(gameState.players.map(p => p.seatIndex));
        let freeSeat = -1;
        for (let i = 0; i < gameState.config.maxPlayers; i++) {
          if (!occupiedSeats.has(i)) { freeSeat = i; break; }
        }
        if (freeSeat === -1) continue;

        gameState = addPlayer(gameState, playerId, playerName, freeSeat);
        await redis.set(`poker:table:${info.tableId}:state`, JSON.stringify(gameState));
        await updateLobbyPlayerCount(info.tableId, gameState.players.length);
        await redis.sadd(`poker:player:${playerId}:tables`, info.tableId);

        return {
          success: true,
          redirect: info.tableId,
          gameState: toClientState(gameState, playerId),
        };
      }
    }
  }

  // No available table - create a new overflow table
  const newTableNumber = maxTableNumber + 1;
  const newTableId = `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Build game config matching the original table's settings
  const chips = originalTableInfo.startingChips || DEFAULT_CONFIG.startingChips;
  const interval = originalTableInfo.blindIntervalMinutes || 3;
  const gameConfig = {
    ...DEFAULT_CONFIG,
    startingChips: chips,
    blindLevels: (originalTableInfo.startingChips || originalTableInfo.blindIntervalMinutes)
      ? buildBlindLevels(chips, interval)
      : DEFAULT_CONFIG.blindLevels,
  };

  let gameState = createGame(newTableId, gameConfig);
  gameState = addPlayer(gameState, playerId, playerName, 0);
  await redis.set(`poker:table:${newTableId}:state`, JSON.stringify(gameState));

  // Propagate sybil config to the overflow table
  const sybilJson = await redis.get(`poker:table:${originalTableId}:sybil`);
  if (sybilJson) {
    await redis.set(`poker:table:${newTableId}:sybil`, typeof sybilJson === 'string' ? sybilJson : JSON.stringify(sybilJson));
  }

  const baseName = originalTableInfo.name.replace(/\s*\(Table \d+\)$/, '');
  const newTableInfo: TableInfo = {
    tableId: newTableId,
    name: `${baseName} (Table ${newTableNumber})`,
    playerCount: 1,
    maxPlayers: gameConfig.maxPlayers,
    blinds: `${gameConfig.blindLevels[0].smallBlind}/${gameConfig.blindLevels[0].bigBlind}`,
    status: 'waiting',
    createdAt: Date.now(),
    creatorId: originalTableInfo.creatorId,
    tournamentId,
    tableNumber: newTableNumber,
    startingChips: chips,
    blindIntervalMinutes: interval,
    ...(originalTableInfo.scheduledStartTime ? { scheduledStartTime: originalTableInfo.scheduledStartTime } : {}),
    ...(originalTableInfo.sybilResistance ? { sybilResistance: originalTableInfo.sybilResistance } : {}),
  };

  await redis.zadd('poker:lobby', { score: Date.now(), member: JSON.stringify(newTableInfo) });
  await redis.sadd(`poker:player:${playerId}:tables`, newTableId);

  // Rename original table to include "(Table 1)" if not already
  if (!originalTableInfo.name.includes('(Table')) {
    const origEntry = lobbyEntries.find(e => {
      const info: TableInfo = typeof e === 'string' ? JSON.parse(e) : e;
      return info.tableId === originalTableId;
    });
    if (origEntry) {
      await redis.zrem('poker:lobby', typeof origEntry === 'string' ? origEntry : JSON.stringify(origEntry));
      const updatedOrig: TableInfo = {
        ...originalTableInfo,
        name: `${originalTableInfo.name} (Table 1)`,
        tableNumber: 1,
      };
      await redis.zadd('poker:lobby', { score: originalTableInfo.createdAt, member: JSON.stringify(updatedOrig) });
    }
  }

  return {
    success: true,
    redirect: newTableId,
    gameState: toClientState(gameState, playerId),
  };
}
