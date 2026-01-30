// Multi-Table Tournament (MTT) core logic

import { Redis } from '@upstash/redis';
import {
  TournamentState,
  TournamentPlayerEntry,
  PlayerMoveNotification,
  TournamentInfo,
} from './tournament-types';
import {
  GameState,
  GameConfig,
  TableInfo,
  BlindLevel,
  buildBlindLevels,
  SybilResistanceConfig,
} from './types';
import { createGame, addPlayer, startGame, startHand } from './engine';
import { updateLobbyStatus } from './lobby';

// ── Create Tournament ──────────────────────────────────────────────

export interface CreateTournamentConfig {
  name: string;
  creatorId: string;
  maxPlayers: number;
  startingChips: number;
  blindIntervalMinutes: number;
  sybilResistance?: SybilResistanceConfig;
}

export async function createTournament(
  redis: Redis,
  config: CreateTournamentConfig
): Promise<TournamentState> {
  const tournamentId = `mtt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const blindLevels = buildBlindLevels(config.startingChips, config.blindIntervalMinutes);

  const tournament: TournamentState = {
    tournamentId,
    name: config.name,
    status: 'registering',
    createdAt: Date.now(),
    creatorId: config.creatorId,
    maxPlayers: config.maxPlayers,
    startingChips: config.startingChips,
    blindIntervalMinutes: config.blindIntervalMinutes,
    currentBlindLevel: 0,
    blindLevels,
    registeredCount: 0,
    remainingCount: 0,
    tableIds: [],
    finishOrder: [],
    sybilResistance: config.sybilResistance,
  };

  await redis.set(`poker:tournament:${tournamentId}`, JSON.stringify(tournament));

  // Add to tournament index (sorted by createdAt)
  await redis.zadd('poker:tournaments', { score: Date.now(), member: tournamentId });

  return tournament;
}

// ── Register Player ────────────────────────────────────────────────

export async function registerPlayer(
  redis: Redis,
  tournamentId: string,
  playerId: string,
  playerName: string
): Promise<{ success: boolean; error?: string }> {
  const tournament = await loadTournament(redis, tournamentId);
  if (!tournament) return { success: false, error: 'Tournament not found' };
  if (tournament.status !== 'registering') return { success: false, error: 'Registration closed' };
  if (tournament.registeredCount >= tournament.maxPlayers) return { success: false, error: 'Tournament full' };

  // Check if already registered
  const existing = await redis.hget(`poker:tournament:${tournamentId}:players`, playerId);
  if (existing) return { success: false, error: 'Already registered' };

  const entry: TournamentPlayerEntry = {
    playerId,
    name: playerName,
    status: 'registered',
    chipCount: tournament.startingChips,
  };

  await redis.hset(`poker:tournament:${tournamentId}:players`, { [playerId]: JSON.stringify(entry) });

  tournament.registeredCount += 1;
  await saveTournament(redis, tournament);

  return { success: true };
}

// ── Start Tournament ───────────────────────────────────────────────

export async function startTournament(
  redis: Redis,
  tournamentId: string,
  requesterId: string
): Promise<{ success: boolean; error?: string; tableIds?: string[] }> {
  const tournament = await loadTournament(redis, tournamentId);
  if (!tournament) return { success: false, error: 'Tournament not found' };
  if (tournament.status !== 'registering') return { success: false, error: 'Tournament already started' };
  if (tournament.creatorId !== requesterId) return { success: false, error: 'Only the creator can start' };
  if (tournament.registeredCount < 2) return { success: false, error: 'Need at least 2 players' };

  // Load all registered players
  const playersHash = await redis.hgetall(`poker:tournament:${tournamentId}:players`);
  const players: TournamentPlayerEntry[] = Object.values(playersHash || {}).map(
    (v) => (typeof v === 'string' ? JSON.parse(v) : v) as TournamentPlayerEntry
  );

  // Calculate table distribution
  const numTables = Math.ceil(players.length / 6);
  const shuffled = shuffleArray([...players]);

  // Distribute players round-robin across tables
  const tableAssignments: TournamentPlayerEntry[][] = Array.from({ length: numTables }, () => []);
  shuffled.forEach((player, i) => {
    tableAssignments[i % numTables].push(player);
  });

  // Build game config
  const gameConfig: GameConfig = {
    maxPlayers: 6,
    startingChips: tournament.startingChips,
    blindLevels: tournament.blindLevels,
    actionTimeout: 30,
    payoutStructure: [65, 35],
  };

  const tableIds: string[] = [];

  for (let t = 0; t < numTables; t++) {
    const tablePlayers = tableAssignments[t];
    const tableId = `mtt_table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    tableIds.push(tableId);

    // Create game state and add players
    let gameState = createGame(tableId, gameConfig);
    for (let s = 0; s < tablePlayers.length; s++) {
      gameState = addPlayer(gameState, tablePlayers[s].playerId, tablePlayers[s].name, s);
    }

    // Start the game immediately
    gameState = startGame(gameState);

    // Save game state
    await redis.set(`poker:table:${tableId}:state`, JSON.stringify(gameState));

    // Copy sybil config if present
    if (tournament.sybilResistance) {
      await redis.set(`poker:table:${tableId}:sybil`, JSON.stringify(tournament.sybilResistance));
    }

    // Add to lobby
    const blinds = tournament.blindLevels[0];
    const tableInfo: TableInfo = {
      tableId,
      name: numTables > 1 ? `${tournament.name} (Table ${t + 1})` : tournament.name,
      playerCount: tablePlayers.length,
      maxPlayers: 6,
      blinds: `${blinds.smallBlind}/${blinds.bigBlind}`,
      status: 'playing',
      createdAt: Date.now(),
      creatorId: tournament.creatorId,
      tournamentId,
      tableNumber: t + 1,
      startingChips: tournament.startingChips,
      blindIntervalMinutes: tournament.blindIntervalMinutes,
    };
    await redis.zadd('poker:lobby', { score: tableInfo.createdAt, member: JSON.stringify(tableInfo) });

    // Update player entries with table assignment
    for (const p of tablePlayers) {
      p.status = 'playing';
      p.currentTableId = tableId;
      await redis.hset(`poker:tournament:${tournamentId}:players`, {
        [p.playerId]: JSON.stringify(p),
      });
      await redis.sadd(`poker:player:${p.playerId}:tables`, tableId);
    }
  }

  // Update tournament state
  tournament.status = 'running';
  tournament.startedAt = Date.now();
  tournament.remainingCount = players.length;
  tournament.tableIds = tableIds;
  await saveTournament(redis, tournament);

  return { success: true, tableIds };
}

// ── Post-Hand Hook (core MTT logic) ───────────────────────────────

export async function runPostHand(
  redis: Redis,
  tableId: string,
  gameState: GameState,
  tournamentId: string
): Promise<GameState> {
  const tournament = await loadTournament(redis, tournamentId);
  if (!tournament || (tournament.status !== 'running' && tournament.status !== 'final_table')) {
    return gameState;
  }

  // ── Step 1: Handle eliminations ──
  const eliminatedPlayers = gameState.players.filter(
    (p) => p.chips === 0 && !p.disconnected
  );

  for (const eliminated of eliminatedPlayers) {
    const entryRaw = await redis.hget(`poker:tournament:${tournamentId}:players`, eliminated.odentity);
    if (!entryRaw) continue;
    const entry: TournamentPlayerEntry = typeof entryRaw === 'string' ? JSON.parse(entryRaw) : entryRaw;

    if (entry.status === 'eliminated') continue; // already processed

    entry.status = 'eliminated';
    entry.finishPosition = tournament.remainingCount;
    entry.chipCount = 0;

    tournament.finishOrder.push(eliminated.odentity);
    tournament.remainingCount -= 1;

    await redis.hset(`poker:tournament:${tournamentId}:players`, {
      [eliminated.odentity]: JSON.stringify(entry),
    });
  }

  // Remove eliminated players from table's players array
  gameState = {
    ...gameState,
    players: gameState.players.filter((p) => p.chips > 0 || p.disconnected),
  };

  // ── Step 2: Check if table is empty or has 1 player ──
  const activePlayers = gameState.players.filter((p) => !p.disconnected);

  if (activePlayers.length === 0) {
    // Table is empty — remove from tournament
    tournament.tableIds = tournament.tableIds.filter((id) => id !== tableId);
    await saveTournament(redis, tournament);
    await updateLobbyStatus(redis, tableId, { status: 'finished', playerCount: 0 });
    return { ...gameState, phase: 'finished' };
  }

  if (activePlayers.length === 1 && tournament.tableIds.length > 1) {
    // Only 1 player left at this table but other tables exist — move them
    const otherTableIds = tournament.tableIds.filter((id) => id !== tableId);
    const destinationTableId = await findSmallestTable(redis, otherTableIds);

    if (destinationTableId) {
      await movePlayer(redis, tournamentId, activePlayers[0].odentity, tableId, destinationTableId, 'table_closed');
      // Remove this table from tournament
      tournament.tableIds = tournament.tableIds.filter((id) => id !== tableId);
      await saveTournament(redis, tournament);
      await updateLobbyStatus(redis, tableId, { status: 'finished', playerCount: 0 });
      return { ...gameState, players: [], phase: 'finished' };
    }
  }

  // ── Step 3: Check for tournament winner ──
  if (tournament.remainingCount === 1) {
    const winner = activePlayers[0];
    if (winner) {
      const entryRaw = await redis.hget(`poker:tournament:${tournamentId}:players`, winner.odentity);
      if (entryRaw) {
        const entry: TournamentPlayerEntry = typeof entryRaw === 'string' ? JSON.parse(entryRaw) : entryRaw;
        entry.status = 'winner';
        entry.finishPosition = 1;
        entry.chipCount = winner.chips;
        await redis.hset(`poker:tournament:${tournamentId}:players`, {
          [winner.odentity]: JSON.stringify(entry),
        });
      }
      tournament.winnerId = winner.odentity;
      tournament.status = 'finished';
      tournament.finishedAt = Date.now();
      await saveTournament(redis, tournament);
    }
    return gameState;
  }

  // ── Step 4: Check final table trigger ──
  if (tournament.remainingCount <= 6 && tournament.tableIds.length > 1) {
    gameState = await consolidateFinalTable(redis, tournament, tableId, gameState);
    return gameState;
  }

  // ── Step 5: Table balancing ──
  if (tournament.tableIds.length > 1) {
    await balanceTables(redis, tournament);
  }

  // ── Step 6: Advance blinds ──
  gameState = advanceTournamentBlinds(tournament, gameState);
  await saveTournament(redis, tournament);

  return gameState;
}

// ── Move Player Between Tables ─────────────────────────────────────

async function movePlayer(
  redis: Redis,
  tournamentId: string,
  playerId: string,
  fromTableId: string,
  toTableId: string,
  reason: PlayerMoveNotification['reason']
): Promise<void> {
  // Load source table
  const srcRaw = await redis.get(`poker:table:${fromTableId}:state`);
  if (!srcRaw) return;
  let srcState: GameState = typeof srcRaw === 'string' ? JSON.parse(srcRaw) : srcRaw;

  const player = srcState.players.find((p) => p.odentity === playerId);
  if (!player) return;

  const chipCount = player.chips;

  // Remove from source
  srcState = {
    ...srcState,
    players: srcState.players.filter((p) => p.odentity !== playerId),
  };
  await redis.set(`poker:table:${fromTableId}:state`, JSON.stringify(srcState));
  await updateLobbyStatus(redis, fromTableId, {
    playerCount: srcState.players.filter((p) => !p.disconnected).length,
  });

  // Load destination table
  const dstRaw = await redis.get(`poker:table:${toTableId}:state`);
  if (!dstRaw) return;
  let dstState: GameState = typeof dstRaw === 'string' ? JSON.parse(dstRaw) : dstRaw;

  // Find empty seat
  const occupiedSeats = new Set(dstState.players.map((p) => p.seatIndex));
  let emptySeat = -1;
  for (let s = 0; s < 6; s++) {
    if (!occupiedSeats.has(s)) {
      emptySeat = s;
      break;
    }
  }
  if (emptySeat === -1) return; // No room (shouldn't happen if logic is correct)

  // Add player to destination with sitOut so they join next hand
  const newPlayer = {
    odentity: playerId,
    name: player.name,
    odentity_label: player.odentity_label,
    seatIndex: emptySeat,
    chips: chipCount,
    bet: 0,
    totalBet: 0,
    holeCards: [] as typeof player.holeCards,
    folded: true, // Folded for current hand
    allIn: false,
    disconnected: false,
    lastAction: undefined,
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
    consecutiveTimeouts: 0,
    sitOut: false,
  };

  dstState = {
    ...dstState,
    players: [...dstState.players, newPlayer].sort((a, b) => a.seatIndex - b.seatIndex),
  };
  await redis.set(`poker:table:${toTableId}:state`, JSON.stringify(dstState));
  await updateLobbyStatus(redis, toTableId, {
    playerCount: dstState.players.filter((p) => !p.disconnected).length,
  });

  // Update tournament player entry
  const entryRaw = await redis.hget(`poker:tournament:${tournamentId}:players`, playerId);
  if (entryRaw) {
    const entry: TournamentPlayerEntry = typeof entryRaw === 'string' ? JSON.parse(entryRaw) : entryRaw;
    entry.currentTableId = toTableId;
    entry.chipCount = chipCount;
    await redis.hset(`poker:tournament:${tournamentId}:players`, {
      [playerId]: JSON.stringify(entry),
    });
  }

  // Update player's tables set
  await redis.srem(`poker:player:${playerId}:tables`, fromTableId);
  await redis.sadd(`poker:player:${playerId}:tables`, toTableId);

  // Write move notification for frontend redirect
  const notification: PlayerMoveNotification = {
    playerId,
    fromTableId,
    toTableId,
    chipCount,
    reason,
    timestamp: Date.now(),
  };
  await redis.hset(`poker:tournament:${tournamentId}:moves`, {
    [playerId]: JSON.stringify(notification),
  });
}

// ── Final Table Consolidation ──────────────────────────────────────

async function consolidateFinalTable(
  redis: Redis,
  tournament: TournamentState,
  currentTableId: string,
  currentGameState: GameState
): Promise<GameState> {
  // Acquire lock to prevent concurrent consolidation
  const lockKey = `poker:tournament:${tournament.tournamentId}:lock`;
  const acquired = await redis.set(lockKey, '1', { nx: true, ex: 5 });
  if (!acquired) return currentGameState; // Another table is handling it

  try {
    // Pick the table with the most players as the final table
    let finalTableId = currentTableId;
    let maxPlayers = currentGameState.players.filter((p) => !p.disconnected).length;

    for (const tid of tournament.tableIds) {
      if (tid === currentTableId) continue;
      const raw = await redis.get(`poker:table:${tid}:state`);
      if (!raw) continue;
      const state = (typeof raw === 'string' ? JSON.parse(raw) : raw) as GameState;
      const count = state.players.filter((p) => !p.disconnected).length;
      if (count > maxPlayers) {
        finalTableId = tid;
        maxPlayers = count;
      }
    }

    // Move all players from other tables to the final table
    for (const tid of tournament.tableIds) {
      if (tid === finalTableId) continue;

      const raw = await redis.get(`poker:table:${tid}:state`);
      if (!raw) continue;
      const state = (typeof raw === 'string' ? JSON.parse(raw) : raw) as GameState;

      for (const player of state.players) {
        if (!player.disconnected && player.chips > 0) {
          await movePlayer(redis, tournament.tournamentId, player.odentity, tid, finalTableId, 'final_table');
        }
      }

      // Mark table as finished
      await updateLobbyStatus(redis, tid, { status: 'finished', playerCount: 0 });
    }

    // Update tournament
    tournament.tableIds = [finalTableId];
    tournament.status = 'final_table';
    await saveTournament(redis, tournament);

    // Reload final table state if it's the current table
    if (finalTableId === currentTableId) {
      const raw = await redis.get(`poker:table:${currentTableId}:state`);
      if (raw) {
        return (typeof raw === 'string' ? JSON.parse(raw) : raw) as GameState;
      }
    }

    // If current table is not the final table, mark it as finished
    return { ...currentGameState, players: [], phase: 'finished' as const };
  } finally {
    await redis.del(lockKey);
  }
}

// ── Table Balancing ────────────────────────────────────────────────

async function balanceTables(
  redis: Redis,
  tournament: TournamentState
): Promise<void> {
  // Acquire lock
  const lockKey = `poker:tournament:${tournament.tournamentId}:lock`;
  const acquired = await redis.set(lockKey, '1', { nx: true, ex: 5 });
  if (!acquired) return; // Another table is handling it

  try {
    // Load player counts for all active tables
    const tableCounts: { tableId: string; count: number; state: GameState }[] = [];

    for (const tid of tournament.tableIds) {
      const raw = await redis.get(`poker:table:${tid}:state`);
      if (!raw) continue;
      const state = (typeof raw === 'string' ? JSON.parse(raw) : raw) as GameState;
      const count = state.players.filter((p) => !p.disconnected && p.chips > 0).length;
      tableCounts.push({ tableId: tid, count, state });
    }

    if (tableCounts.length < 2) return;

    tableCounts.sort((a, b) => a.count - b.count);
    const smallest = tableCounts[0];
    const largest = tableCounts[tableCounts.length - 1];

    if (largest.count - smallest.count < 2) return; // Already balanced

    // Pick a player to move from the largest table
    // Choose the player at the highest seat index (simple, deterministic)
    const activePlayers = largest.state.players
      .filter((p) => !p.disconnected && p.chips > 0 && !p.folded && !p.allIn)
      .sort((a, b) => b.seatIndex - a.seatIndex);

    // If no unfrozen players (all in hand), try any active player
    const candidates = activePlayers.length > 0
      ? activePlayers
      : largest.state.players.filter((p) => !p.disconnected && p.chips > 0).sort((a, b) => b.seatIndex - a.seatIndex);

    if (candidates.length === 0) return;

    const playerToMove = candidates[0];
    await movePlayer(
      redis,
      tournament.tournamentId,
      playerToMove.odentity,
      largest.tableId,
      smallest.tableId,
      'rebalance'
    );
  } finally {
    await redis.del(lockKey);
  }
}

// ── Blind Advancement ──────────────────────────────────────────────

function advanceTournamentBlinds(
  tournament: TournamentState,
  gameState: GameState
): GameState {
  if (!tournament.startedAt) return gameState;

  const intervalMs = tournament.blindIntervalMinutes * 60 * 1000;
  const elapsed = Date.now() - tournament.startedAt;
  const newLevel = Math.min(
    Math.floor(elapsed / intervalMs),
    tournament.blindLevels.length - 1
  );

  if (newLevel !== tournament.currentBlindLevel) {
    tournament.currentBlindLevel = newLevel;
  }

  // Apply tournament blind level to this table's game state
  const blinds = tournament.blindLevels[newLevel] || tournament.blindLevels[tournament.blindLevels.length - 1];
  const updatedConfig: typeof gameState.config = {
    ...gameState.config,
    blindLevels: tournament.blindLevels,
  };

  return {
    ...gameState,
    blindLevel: newLevel,
    blindLevelStartTime: tournament.startedAt + newLevel * intervalMs,
    config: updatedConfig,
  };
}

// ── Helpers ────────────────────────────────────────────────────────

async function loadTournament(redis: Redis, tournamentId: string): Promise<TournamentState | null> {
  const raw = await redis.get(`poker:tournament:${tournamentId}`);
  if (!raw) return null;
  return (typeof raw === 'string' ? JSON.parse(raw) : raw) as TournamentState;
}

async function saveTournament(redis: Redis, tournament: TournamentState): Promise<void> {
  await redis.set(`poker:tournament:${tournament.tournamentId}`, JSON.stringify(tournament));
}

async function findSmallestTable(redis: Redis, tableIds: string[]): Promise<string | null> {
  let smallest: string | null = null;
  let minCount = Infinity;

  for (const tid of tableIds) {
    const raw = await redis.get(`poker:table:${tid}:state`);
    if (!raw) continue;
    const state = (typeof raw === 'string' ? JSON.parse(raw) : raw) as GameState;
    const count = state.players.filter((p) => !p.disconnected).length;
    if (count < minCount && count < 6) {
      minCount = count;
      smallest = tid;
    }
  }

  return smallest;
}

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Public Helpers ─────────────────────────────────────────────────

export async function getTournamentState(
  redis: Redis,
  tournamentId: string
): Promise<TournamentState | null> {
  return loadTournament(redis, tournamentId);
}

export async function getTournamentPlayers(
  redis: Redis,
  tournamentId: string
): Promise<TournamentPlayerEntry[]> {
  const hash = await redis.hgetall(`poker:tournament:${tournamentId}:players`);
  if (!hash) return [];
  return Object.values(hash).map((v) =>
    (typeof v === 'string' ? JSON.parse(v) : v) as TournamentPlayerEntry
  );
}

export async function getPlayerMoveNotification(
  redis: Redis,
  tournamentId: string,
  playerId: string
): Promise<PlayerMoveNotification | null> {
  const raw = await redis.hget(`poker:tournament:${tournamentId}:moves`, playerId);
  if (!raw) return null;
  // Delete notification after reading (one-time)
  await redis.hdel(`poker:tournament:${tournamentId}:moves`, playerId);
  return (typeof raw === 'string' ? JSON.parse(raw) : raw) as PlayerMoveNotification;
}

export async function getPlayerTournamentEntry(
  redis: Redis,
  tournamentId: string,
  playerId: string
): Promise<TournamentPlayerEntry | null> {
  const raw = await redis.hget(`poker:tournament:${tournamentId}:players`, playerId);
  if (!raw) return null;
  return (typeof raw === 'string' ? JSON.parse(raw) : raw) as TournamentPlayerEntry;
}

export async function listTournaments(redis: Redis): Promise<TournamentInfo[]> {
  const ids = await redis.zrange('poker:tournaments', 0, -1, { rev: true });
  if (!ids || ids.length === 0) return [];

  const tournaments: TournamentInfo[] = [];
  for (const id of ids) {
    const tournamentId = typeof id === 'string' ? id : String(id);
    const state = await loadTournament(redis, tournamentId);
    if (!state) continue;
    tournaments.push({
      tournamentId: state.tournamentId,
      name: state.name,
      status: state.status,
      registeredCount: state.registeredCount,
      remainingCount: state.remainingCount,
      maxPlayers: state.maxPlayers,
      startingChips: state.startingChips,
      blindIntervalMinutes: state.blindIntervalMinutes,
      createdAt: state.createdAt,
      creatorId: state.creatorId,
    });
  }
  return tournaments;
}

export { loadTournament };
