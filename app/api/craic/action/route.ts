import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { processAction, toClientState } from '@/lib/poker/engine';
import { GameState, GameAction } from '@/lib/poker/types';
import { CraicGameConfig, getPayoutStructure } from '@/lib/craic/types';

const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId, playerId, action, amount } = body;

    if (!gameId || !playerId || !action) {
      return NextResponse.json({ error: 'Missing gameId, playerId, or action' }, { status: 400 });
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

    // Validate game is in progress
    if (gameState.phase === 'waiting' || gameState.phase === 'finished') {
      return NextResponse.json({ error: 'Game not in progress' }, { status: 400 });
    }

    // Process the action
    const gameAction: GameAction = {
      type: action,
      amount: amount,
      playerId,
    };

    gameState = await processAction(gameState, gameAction);

    // Save updated state
    await redis.set(`craic:game:${gameId}:state`, JSON.stringify(gameState));

    // Check if tournament just finished
    let finishData = null;
    if (gameState.phase === 'finished') {
      finishData = await prepareTournamentFinish(gameId, gameState, config);
    }

    return NextResponse.json({
      success: true,
      gameState: toClientState(gameState, playerId),
      finishData,
    });
  } catch (error) {
    console.error('Error processing Craic action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process action' },
      { status: 500 }
    );
  }
}

/**
 * Prepare tournament finish data for contract call
 */
async function prepareTournamentFinish(
  gameId: string,
  gameState: GameState,
  config: CraicGameConfig
): Promise<object | null> {
  try {
    // Rank players by chips (winner has most)
    const rankings = gameState.players
      .filter(p => !p.disconnected)
      .map(p => ({
        address: p.odentity,
        name: p.name,
        chips: p.chips,
      }))
      .sort((a, b) => b.chips - a.chips);

    if (rankings.length < 1) return null;

    const structure = getPayoutStructure(rankings.length);

    const payouts = rankings.map((player, i) => ({
      address: player.address,
      name: player.name,
      chips: player.chips,
      rank: i + 1,
      percent: i < structure.length ? structure[i] : 0,
    }));

    return {
      gameId,
      rankings: payouts,
      payoutStructure: structure,
      contractCall: {
        function: 'completeGame',
        gameHash: config.gameHash || '',
        winners: payouts.filter(p => p.percent > 0).map(p => p.address),
      },
    };
  } catch (error) {
    console.error('Error preparing tournament finish:', error);
    return null;
  }
}
