import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { processAction, toClientState } from '@/lib/poker/engine';
import { GameState, GameAction } from '@/lib/poker/types';
import { CraicGameConfig } from '@/lib/craic/types';

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

    if (rankings.length < 2) return null;

    const winner = rankings[0].address;
    const second = rankings[1].address;
    const others = rankings.slice(2).map(p => p.address);

    // Calculate payouts (65% / 35% split)
    const winnerPrize = Math.floor((config.prizePool * 65) / 100);
    const secondPrize = Math.floor((config.prizePool * 35) / 100);

    return {
      gameId,
      prizePool: config.prizePool,
      bondAmount: config.bondAmount,
      rankings: rankings.map((p, i) => ({
        rank: i + 1,
        address: p.address,
        name: p.name,
        chips: p.chips,
      })),
      payouts: {
        winner: {
          address: winner,
          bondReturn: config.bondAmount,
          prize: winnerPrize,
          total: config.bondAmount + winnerPrize,
        },
        second: {
          address: second,
          bondReturn: config.bondAmount,
          prize: secondPrize,
          total: config.bondAmount + secondPrize,
        },
        others: others.map(addr => ({
          address: addr,
          bondReturn: config.bondAmount,
          prize: 0,
          total: config.bondAmount,
        })),
      },
      // Contract call data
      contractCall: {
        function: 'finishTournament',
        gameId,
        winner,
        second,
        otherPlayers: others,
      },
    };
  } catch (error) {
    console.error('Error preparing tournament finish:', error);
    return null;
  }
}
