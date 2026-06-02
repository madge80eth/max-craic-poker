import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createGame, addPlayer, startGame } from '@/lib/poker/engine';
import { GameState, GameConfig } from '@/lib/poker/types';
import {
  CraicGameConfig,
  BracketState,
  BracketRound,
  BLIND_PRESETS,
  getPayoutStructure,
} from '@/lib/craic/types';

const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId, playerId } = body;

    if (!gameId || !playerId) {
      return NextResponse.json({ error: 'Missing gameId or playerId' }, { status: 400 });
    }

    const configJson = await redis.get(`craic:game:${gameId}:config`);
    if (!configJson) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    const config: CraicGameConfig = typeof configJson === 'string'
      ? JSON.parse(configJson) : configJson;

    if (playerId.toLowerCase() !== config.host.toLowerCase()) {
      return NextResponse.json({ error: 'Only host can create bracket' }, { status: 403 });
    }

    const existing = await redis.get(`craic:bracket:${gameId}`);
    if (existing) {
      return NextResponse.json({ error: 'Bracket already exists' }, { status: 400 });
    }

    const stateJson = await redis.get(`craic:game:${gameId}:state`);
    if (!stateJson) {
      return NextResponse.json({ error: 'Game state not found' }, { status: 404 });
    }
    const parentState: GameState = typeof stateJson === 'string'
      ? JSON.parse(stateJson) : stateJson;

    const players = parentState.players
      .filter(p => !p.disconnected)
      .map(p => ({ address: p.odentity, name: p.name }));

    if (players.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 players' }, { status: 400 });
    }

    // Single table — no bracket needed
    if (players.length <= 6) {
      return NextResponse.json({ error: 'Single table, no bracket needed — use /start instead' }, { status: 400 });
    }

    // Shuffle players randomly (Fisher-Yates)
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Split into 6-max tables
    const tables: { address: string; name: string }[][] = [];
    for (let i = 0; i < shuffled.length; i += 6) {
      tables.push(shuffled.slice(i, i + 6));
    }

    const blindLevels = BLIND_PRESETS[config.blindSpeed] || BLIND_PRESETS.standard;
    const payoutStructure = getPayoutStructure(players.length);

    const tableGameIds: string[] = [];

    for (let t = 0; t < tables.length; t++) {
      const tableId = `${gameId}_r1_t${t + 1}`;
      const tableConfig: GameConfig = {
        maxPlayers: 6,
        startingChips: config.startingStack,
        actionTimeout: 30,
        blindLevels,
        payoutStructure,
      };

      let state = createGame(tableId, tableConfig);

      for (let s = 0; s < tables[t].length; s++) {
        state = addPlayer(state, tables[t][s].address, tables[t][s].name, s);
      }

      state = startGame(state);

      await redis.set(`craic:game:${tableId}:state`, JSON.stringify(state));
      await redis.set(`craic:game:${tableId}:config`, JSON.stringify({
        ...config,
        gameId: tableId,
        status: 'active',
      }));

      tableGameIds.push(tableId);
    }

    const round: BracketRound = {
      roundNumber: 1,
      tables: tableGameIds,
      winners: [],
      byes: [],
      status: 'active',
    };

    const bracket: BracketState = {
      parentGameId: gameId,
      rounds: [round],
      currentRound: 1,
      totalPlayers: players.length,
      status: 'active',
    };

    await redis.set(`craic:bracket:${gameId}`, JSON.stringify(bracket));

    return NextResponse.json({
      success: true,
      bracket,
      tables: tableGameIds.map((id, i) => ({
        gameId: id,
        playerCount: tables[i].length,
        players: tables[i],
      })),
    });
  } catch (error) {
    console.error('Error creating bracket:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create bracket' },
      { status: 500 }
    );
  }
}
