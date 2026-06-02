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
      return NextResponse.json({ error: 'Only host can advance bracket' }, { status: 403 });
    }

    const bracketJson = await redis.get(`craic:bracket:${gameId}`);
    if (!bracketJson) {
      return NextResponse.json({ error: 'Bracket not found' }, { status: 404 });
    }
    const bracket: BracketState = typeof bracketJson === 'string'
      ? JSON.parse(bracketJson) : bracketJson;

    if (bracket.status === 'complete') {
      return NextResponse.json({ error: 'Bracket already complete' }, { status: 400 });
    }

    const currentRound = bracket.rounds[bracket.currentRound - 1];
    if (!currentRound) {
      return NextResponse.json({ error: 'Current round not found' }, { status: 500 });
    }

    // Check all tables in current round are finished
    const tableStates: GameState[] = [];
    for (const tableId of currentRound.tables) {
      const stateJson = await redis.get(`craic:game:${tableId}:state`);
      if (!stateJson) {
        return NextResponse.json({ error: `Table ${tableId} state not found` }, { status: 500 });
      }
      const state: GameState = typeof stateJson === 'string'
        ? JSON.parse(stateJson) : stateJson;

      if (state.phase !== 'finished') {
        return NextResponse.json({
          error: `Table ${tableId} is still in progress (phase: ${state.phase})`,
        }, { status: 400 });
      }
      tableStates.push(state);
    }

    // Collect winner from each table (player with most chips)
    const winners: { address: string; name: string }[] = [];
    for (const state of tableStates) {
      const activePlayers = state.players
        .filter(p => !p.disconnected)
        .sort((a, b) => b.chips - a.chips);

      if (activePlayers.length > 0) {
        winners.push({
          address: activePlayers[0].odentity,
          name: activePlayers[0].name,
        });
      }
    }

    currentRound.winners = winners.map(w => w.address);
    currentRound.status = 'complete';

    // If only one winner — tournament over
    if (winners.length <= 1) {
      bracket.status = 'complete';
      await redis.set(`craic:bracket:${gameId}`, JSON.stringify(bracket));
      return NextResponse.json({ success: true, bracket, final: true });
    }

    // If all winners fit on one table — final table
    if (winners.length <= 6) {
      const nextRoundNum = bracket.currentRound + 1;
      const finalTableId = `${gameId}_r${nextRoundNum}_final`;

      const blindLevels = BLIND_PRESETS[config.blindSpeed] || BLIND_PRESETS.standard;
      const payoutStructure = getPayoutStructure(bracket.totalPlayers);

      const tableConfig: GameConfig = {
        maxPlayers: 6,
        startingChips: config.startingStack,
        actionTimeout: 30,
        blindLevels,
        payoutStructure,
      };

      let state = createGame(finalTableId, tableConfig);
      for (let s = 0; s < winners.length; s++) {
        state = addPlayer(state, winners[s].address, winners[s].name, s);
      }
      state = startGame(state);

      await redis.set(`craic:game:${finalTableId}:state`, JSON.stringify(state));
      await redis.set(`craic:game:${finalTableId}:config`, JSON.stringify({
        ...config,
        gameId: finalTableId,
        status: 'active',
      }));

      const finalRound: BracketRound = {
        roundNumber: nextRoundNum,
        tables: [finalTableId],
        winners: [],
        byes: [],
        status: 'active',
      };

      bracket.rounds.push(finalRound);
      bracket.currentRound = nextRoundNum;

      await redis.set(`craic:bracket:${gameId}`, JSON.stringify(bracket));

      return NextResponse.json({
        success: true,
        bracket,
        finalTable: { gameId: finalTableId, playerCount: winners.length },
      });
    }

    // More than 6 winners — another bracket round
    const advancing = [...winners];

    // Handle odd number: random bye
    const byes: string[] = [];
    if (advancing.length % 2 !== 0 && advancing.length > 6) {
      const byeIdx = Math.floor(Math.random() * advancing.length);
      byes.push(advancing[byeIdx].address);
      advancing.splice(byeIdx, 1);
    }

    // Shuffle advancing players
    for (let i = advancing.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [advancing[i], advancing[j]] = [advancing[j], advancing[i]];
    }

    // Split into 6-max tables
    const tables: { address: string; name: string }[][] = [];
    for (let i = 0; i < advancing.length; i += 6) {
      tables.push(advancing.slice(i, i + 6));
    }

    const nextRoundNum = bracket.currentRound + 1;
    const blindLevels = BLIND_PRESETS[config.blindSpeed] || BLIND_PRESETS.standard;
    const payoutStructure = getPayoutStructure(bracket.totalPlayers);
    const tableGameIds: string[] = [];

    for (let t = 0; t < tables.length; t++) {
      const tableId = `${gameId}_r${nextRoundNum}_t${t + 1}`;
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

    const nextRound: BracketRound = {
      roundNumber: nextRoundNum,
      tables: tableGameIds,
      winners: [],
      byes,
      status: 'active',
    };

    bracket.rounds.push(nextRound);
    bracket.currentRound = nextRoundNum;

    await redis.set(`craic:bracket:${gameId}`, JSON.stringify(bracket));

    return NextResponse.json({
      success: true,
      bracket,
      tables: tableGameIds.map((id, i) => ({
        gameId: id,
        playerCount: tables[i].length,
      })),
      byes,
    });
  } catch (error) {
    console.error('Error advancing bracket:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to advance bracket' },
      { status: 500 }
    );
  }
}
