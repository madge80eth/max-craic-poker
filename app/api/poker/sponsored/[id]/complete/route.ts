import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { GameState } from '@/lib/poker/types';
import { SponsoredTournament } from '@/lib/poker/sponsored-types';

const redis = Redis.fromEnv();

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/poker/sponsored/[id]/complete
 * Called when a sponsored poker game finishes
 * Determines winners and prepares contract call params
 *
 * This is called automatically when the poker game engine detects 'finished' phase
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: tournamentId } = await params;
    const body = await request.json();
    const { gameServerKey } = body;

    // Verify game server key in production
    // const expectedKey = process.env.GAME_SERVER_KEY;
    // if (gameServerKey !== expectedKey) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Get tournament
    const tournamentData = await redis.get(`poker:sponsored:${tournamentId}`);
    if (!tournamentData) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const tournament: SponsoredTournament =
      typeof tournamentData === 'string' ? JSON.parse(tournamentData) : tournamentData;

    if (tournament.status !== 'active') {
      return NextResponse.json({ error: 'Tournament not active' }, { status: 400 });
    }

    // Get game state to determine winners
    const stateJson = await redis.get(`poker:table:${tournament.tableId}:state`);
    if (!stateJson) {
      return NextResponse.json({ error: 'Game state not found' }, { status: 404 });
    }

    const gameState: GameState = typeof stateJson === 'string' ? JSON.parse(stateJson) : stateJson;

    if (gameState.phase !== 'finished') {
      return NextResponse.json({ error: 'Game not finished' }, { status: 400 });
    }

    // Determine rankings by chip count (highest = 1st)
    const playerRankings = gameState.players
      .filter(p => !p.disconnected)
      .map(p => ({
        wallet: p.odentity,
        chips: p.chips,
        name: p.name,
      }))
      .sort((a, b) => b.chips - a.chips);

    if (playerRankings.length < 2) {
      return NextResponse.json({ error: 'Not enough players to determine rankings' }, { status: 400 });
    }

    const winner = playerRankings[0].wallet;
    const second = playerRankings[1].wallet;
    const otherPlayers = playerRankings.slice(2).map(p => p.wallet);

    // Calculate payouts
    const winnerPrize = Math.floor((tournament.prizePool * 65) / 100);
    const secondPrize = Math.floor((tournament.prizePool * 35) / 100);

    const winnerPayout = tournament.bondAmount + winnerPrize;
    const secondPayout = tournament.bondAmount + secondPrize;

    // Update tournament
    tournament.status = 'completed';
    tournament.completedAt = Date.now();
    tournament.winner = winner;
    tournament.second = second;
    tournament.winnerPayout = winnerPayout;
    tournament.secondPayout = secondPayout;

    // Mark players as pending refund (actual refund happens on-chain)
    tournament.players = tournament.players.map(p => ({
      ...p,
      refunded: false, // Will be true after contract call succeeds
    }));

    await redis.set(`poker:sponsored:${tournament.tournamentId}`, JSON.stringify(tournament));

    // Return data needed for contract call
    return NextResponse.json({
      success: true,
      tournament,
      rankings: playerRankings.map((p, i) => ({
        rank: i + 1,
        wallet: p.wallet,
        name: p.name,
        chips: p.chips,
      })),
      payouts: {
        winner: {
          address: winner,
          amount: winnerPayout,
          formatted: `$${(winnerPayout / 100).toFixed(2)}`,
          breakdown: {
            bond: tournament.bondAmount,
            prize: winnerPrize,
          },
        },
        second: {
          address: second,
          amount: secondPayout,
          formatted: `$${(secondPayout / 100).toFixed(2)}`,
          breakdown: {
            bond: tournament.bondAmount,
            prize: secondPrize,
          },
        },
        others: otherPlayers.map(addr => ({
          address: addr,
          amount: tournament.bondAmount,
          formatted: `$${(tournament.bondAmount / 100).toFixed(2)}`,
          breakdown: {
            bond: tournament.bondAmount,
            prize: 0,
          },
        })),
      },
      // Contract call params
      contractCall: {
        function: 'finishTournament',
        args: {
          tournamentId: tournament.tournamentId,
          winner,
          second,
          otherPlayers,
        },
      },
    });
  } catch (error) {
    console.error('Error completing sponsored tournament:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete tournament' },
      { status: 500 }
    );
  }
}
