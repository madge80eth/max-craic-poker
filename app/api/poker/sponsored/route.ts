import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createGame } from '@/lib/poker/engine';
import { TableInfo, DEFAULT_CONFIG, buildBlindLevels } from '@/lib/poker/types';
import {
  SponsoredTournament,
  centsToUsdc,
} from '@/lib/poker/sponsored-types';

const redis = Redis.fromEnv();

/**
 * GET /api/poker/sponsored
 * List all sponsored tournaments
 */
export async function GET() {
  try {
    // Get all sponsored tournaments from Redis
    const tournamentIds = await redis.smembers('poker:sponsored:all');

    const tournaments: SponsoredTournament[] = [];

    for (const id of tournamentIds) {
      const data = await redis.get(`poker:sponsored:${id}`);
      if (data) {
        const tournament = typeof data === 'string' ? JSON.parse(data) : data;
        // Only show non-completed tournaments in the list
        if (tournament.status !== 'completed' && tournament.status !== 'cancelled') {
          tournaments.push(tournament);
        }
      }
    }

    // Sort by creation time, newest first
    tournaments.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({ success: true, tournaments });
  } catch (error) {
    console.error('Error listing sponsored tournaments:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list tournaments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/poker/sponsored
 * Create a new sponsored tournament
 *
 * Body: {
 *   creatorId: string,       // Wallet address of creator (also the sponsor)
 *   creatorName: string,     // Display name
 *   prizePool: number,       // Prize pool in cents (required, e.g., 5000 = $50)
 *   bondAmount?: number,     // Optional bond in cents (default 0 = no bonds)
 *   maxPlayers?: number,     // Default 6
 *   startingStack?: number,  // Starting chips (default 1500)
 *   blindSpeed?: string,     // 'turbo' | 'standard' | 'deep' (default 'standard')
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      creatorId,
      creatorName,
      prizePool,
      bondAmount = 0,
      maxPlayers = 6,
      startingStack = 1500,
      blindSpeed = 'standard',
    } = body;

    if (!creatorId || !creatorName) {
      return NextResponse.json({ error: 'Missing creatorId or creatorName' }, { status: 400 });
    }

    if (!prizePool || prizePool < 100) {
      return NextResponse.json({ error: 'Prize pool must be at least $1 (100 cents)' }, { status: 400 });
    }

    if (maxPlayers < 2 || maxPlayers > 6) {
      return NextResponse.json({ error: 'Max players must be between 2 and 6' }, { status: 400 });
    }

    // Generate table ID
    const tableId = `sponsored_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Generate tournament ID (matches contract's keccak256)
    const tournamentId = `0x${Buffer.from(
      tableId + Date.now().toString() + creatorId
    ).toString('hex').slice(0, 64).padEnd(64, '0')}`;

    // Build game config from settings
    const blindIntervalMinutes = blindSpeed === 'turbo' ? 5 : blindSpeed === 'deep' ? 15 : 10;
    const gameConfig = {
      ...DEFAULT_CONFIG,
      maxPlayers: maxPlayers as 6,
      startingChips: startingStack,
      blindLevels: buildBlindLevels(startingStack, blindIntervalMinutes),
    };

    // Create game state (using existing poker engine)
    const gameState = createGame(tableId, gameConfig);

    // Store game state in Redis
    await redis.set(`poker:table:${tableId}:state`, JSON.stringify(gameState));

    // Create sponsored tournament record
    // Sponsor = creator. Status = 'sponsored' because prize pool is provided at creation.
    const tournament: SponsoredTournament = {
      tournamentId,
      tableId,
      contractAddress: '', // Updated after contract deployment — see contracts/DEPLOY.md

      sponsor: creatorId,
      prizePool,
      bondAmount,

      maxPlayers,
      playerCount: 0,
      players: [],

      status: 'sponsored',
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
    };

    // Store tournament in Redis
    await redis.set(`poker:sponsored:${tournamentId}`, JSON.stringify(tournament));
    await redis.sadd('poker:sponsored:all', tournamentId);

    // Also add to regular lobby (so it shows up with sponsored badge)
    const tableInfo: TableInfo = {
      tableId,
      name: `Sponsored: $${prizePool / 100} Prize Pool`,
      playerCount: 0,
      maxPlayers,
      blinds: `${gameConfig.blindLevels[0].smallBlind}/${gameConfig.blindLevels[0].bigBlind}`,
      status: 'waiting',
      createdAt: Date.now(),
      creatorId,
      startingChips: startingStack,
    };

    await redis.zadd('poker:lobby', { score: Date.now(), member: JSON.stringify(tableInfo) });

    return NextResponse.json({
      success: true,
      tournamentId,
      tableId,
      tournament,
      // For contract interaction
      bondAmountUsdc: centsToUsdc(bondAmount).toString(),
      prizePoolUsdc: prizePool ? centsToUsdc(prizePool).toString() : '0',
    });
  } catch (error) {
    console.error('Error creating sponsored tournament:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create tournament' },
      { status: 500 }
    );
  }
}
