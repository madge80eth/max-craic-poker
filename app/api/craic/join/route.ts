import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { addPlayer, toClientState } from '@/lib/poker/engine';
import { GameState } from '@/lib/poker/types';
import { CraicGameConfig, CraicGameInfo } from '@/lib/craic/types';
import { verifySybilRequirements } from '@/lib/craic/sybil';

const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId, playerId, playerName, seatIndex, skipSybilCheck = false } = body;

    if (!gameId || !playerId || !playerName || seatIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing gameId, playerId, playerName, or seatIndex' },
        { status: 400 }
      );
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

    // Check if game is still in waiting phase
    if (gameState.phase !== 'waiting') {
      return NextResponse.json({ error: 'Game already started' }, { status: 400 });
    }

    // Check if player already in game
    const existingPlayer = gameState.players.find(p => p.odentity === playerId);
    if (existingPlayer) {
      return NextResponse.json({ error: 'Player already in game' }, { status: 400 });
    }

    // Check if game is full
    if (gameState.players.length >= config.maxPlayers) {
      return NextResponse.json({ error: 'Game is full' }, { status: 400 });
    }

    // Verify sybil requirements (skip for development/testing)
    if (!skipSybilCheck) {
      const sybilResult = await verifySybilRequirements(playerId, {
        nftGating: config.sybilOptions.nftGating.enabled ? {
          enabled: true,
          contractAddress: config.sybilOptions.nftGating.contractAddress,
          tokenId: config.sybilOptions.nftGating.tokenId,
          isERC1155: config.sybilOptions.nftGating.isERC1155,
        } : { enabled: false },
        bondMechanic: config.sybilOptions.bondMechanic.enabled ? {
          enabled: true,
          amount: config.sybilOptions.bondMechanic.amount,
          contractAddress: process.env.CRAIC_CONTRACT_ADDRESS, // Use contract for bond check
        } : { enabled: false },
        coinbaseVerification: config.sybilOptions.coinbaseVerification.enabled ? {
          enabled: true,
        } : { enabled: false },
      });

      if (!sybilResult.passed) {
        return NextResponse.json({
          error: 'Sybil verification failed',
          failedChecks: sybilResult.failedChecks,
          results: sybilResult.results,
        }, { status: 403 });
      }
    }

    // Add player to game
    gameState = addPlayer(gameState, playerId, playerName, seatIndex);

    // Save updated state
    await redis.set(`craic:game:${gameId}:state`, JSON.stringify(gameState));

    // Update lobby entry
    const lobbyEntries = await redis.zrange('craic:lobby', 0, -1);
    for (const entry of lobbyEntries) {
      const gameInfo: CraicGameInfo = typeof entry === 'string' ? JSON.parse(entry) : entry;
      if (gameInfo.gameId === gameId) {
        await redis.zrem('craic:lobby', JSON.stringify(gameInfo));
        const updatedInfo: CraicGameInfo = {
          ...gameInfo,
          playerCount: gameState.players.length,
        };
        await redis.zadd('craic:lobby', { score: gameInfo.createdAt, member: JSON.stringify(updatedInfo) });
        break;
      }
    }

    // Track player's games
    await redis.sadd(`craic:player:${playerId}:games`, gameId);

    return NextResponse.json({
      success: true,
      gameState: toClientState(gameState, playerId),
    });
  } catch (error) {
    console.error('Error joining Craic game:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to join game' },
      { status: 500 }
    );
  }
}
