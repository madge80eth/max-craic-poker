import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { GameState } from '@/lib/poker/types';
import { CraicGameConfig, CraicGameInfo } from '@/lib/craic/types';

const redis = Redis.fromEnv();

/**
 * Finish a Craic tournament and prepare payout data
 * Called by server after game ends, or by host to force finish
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId, playerId } = body;

    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
    }

    // Get game config
    const configJson = await redis.get(`craic:game:${gameId}:config`);
    if (!configJson) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    const config: CraicGameConfig = typeof configJson === 'string' ? JSON.parse(configJson) : configJson;

    // Optional: Verify caller is host
    if (playerId && playerId.toLowerCase() !== config.host.toLowerCase()) {
      return NextResponse.json({ error: 'Only host can finish tournament' }, { status: 403 });
    }

    // Get current game state
    const stateJson = await redis.get(`craic:game:${gameId}:state`);
    if (!stateJson) {
      return NextResponse.json({ error: 'Game state not found' }, { status: 404 });
    }
    const gameState: GameState = typeof stateJson === 'string' ? JSON.parse(stateJson) : stateJson;

    // Rank players by chips
    const rankings = gameState.players
      .filter(p => !p.disconnected)
      .map(p => ({
        address: p.odentity,
        name: p.name,
        chips: p.chips,
      }))
      .sort((a, b) => b.chips - a.chips);

    if (rankings.length < 1) {
      return NextResponse.json({ error: 'No players to finish' }, { status: 400 });
    }

    // Handle different player counts
    let payouts;
    if (rankings.length === 1) {
      // Only one player left - they get everything
      payouts = {
        winner: {
          address: rankings[0].address,
          bondReturn: config.bondAmount,
          prize: config.prizePool,
          total: config.bondAmount + config.prizePool,
        },
        second: null,
        others: [],
      };
    } else {
      // Standard 65/35 split
      const winnerPrize = Math.floor((config.prizePool * 65) / 100);
      const secondPrize = config.prizePool - winnerPrize; // Give remainder to second

      const winner = rankings[0].address;
      const second = rankings[1].address;
      const others = rankings.slice(2).map(p => p.address);

      payouts = {
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
      };
    }

    // Update lobby entry status to finished
    const lobbyEntries = await redis.zrange('craic:lobby', 0, -1);
    for (const entry of lobbyEntries) {
      const gameInfo: CraicGameInfo = typeof entry === 'string' ? JSON.parse(entry) : entry;
      if (gameInfo.gameId === gameId) {
        await redis.zrem('craic:lobby', JSON.stringify(gameInfo));
        const updatedInfo: CraicGameInfo = { ...gameInfo, status: 'finished' };
        await redis.zadd('craic:lobby', { score: gameInfo.createdAt, member: JSON.stringify(updatedInfo) });
        break;
      }
    }

    // Store finish data for reference
    const finishData = {
      gameId,
      prizePool: config.prizePool,
      bondAmount: config.bondAmount,
      rankings: rankings.map((p, i) => ({
        rank: i + 1,
        address: p.address,
        name: p.name,
        chips: p.chips,
      })),
      payouts,
      finishedAt: Date.now(),
      // Contract call data for frontend to execute
      contractCall: {
        function: 'finishTournament',
        gameId,
        winner: rankings[0]?.address || '',
        second: rankings[1]?.address || rankings[0]?.address || '',
        otherPlayers: rankings.slice(2).map(p => p.address),
      },
    };

    await redis.set(`craic:game:${gameId}:finish`, JSON.stringify(finishData));

    return NextResponse.json({
      success: true,
      finishData,
    });
  } catch (error) {
    console.error('Error finishing Craic tournament:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to finish tournament' },
      { status: 500 }
    );
  }
}
