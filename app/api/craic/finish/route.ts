import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createWalletClient, http, Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { waitUntil } from '@vercel/functions';
import { GameState } from '@/lib/poker/types';
import { CraicGameConfig, CraicGameInfo, getPayoutStructure } from '@/lib/craic/types';
import {
  CRAIC_HOME_GAME_ABI,
  CRAIC_CONTRACT_ADDRESS,
  getGame,
  getGameTokens,
  getTokenBalanceOnChain,
  encodeCompleteGame,
} from '@/lib/craic/contract';

const redis = Redis.fromEnv();

const isTestnet = process.env.NEXT_PUBLIC_TESTNET === 'true';
const chain = isTestnet ? baseSepolia : base;
const rpcUrl = isTestnet ? 'https://sepolia.base.org' : 'https://mainnet.base.org';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId, playerId } = body;

    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
    }

    // ── 1. Load config & state from Redis ──

    const configJson = await redis.get(`craic:game:${gameId}:config`);
    if (!configJson) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    const config: CraicGameConfig = typeof configJson === 'string'
      ? JSON.parse(configJson) : configJson;

    if (playerId && playerId.toLowerCase() !== config.host.toLowerCase()) {
      return NextResponse.json({ error: 'Only host can finish game' }, { status: 403 });
    }

    const stateJson = await redis.get(`craic:game:${gameId}:state`);
    if (!stateJson) {
      return NextResponse.json({ error: 'Game state not found' }, { status: 404 });
    }
    const gameState: GameState = typeof stateJson === 'string'
      ? JSON.parse(stateJson) : stateJson;

    // ── 2. Rank players by chips ──

    const rankings = gameState.players
      .filter(p => !p.disconnected)
      .map(p => ({ address: p.odentity, name: p.name, chips: p.chips }))
      .sort((a, b) => b.chips - a.chips);

    if (rankings.length < 1) {
      return NextResponse.json({ error: 'No players to finish' }, { status: 400 });
    }

    // ── 3. Determine payout percentages ──

    const structure = getPayoutStructure(rankings.length);
    const winners = rankings.slice(0, structure.length);

    // ── 4. Read on-chain escrow balances ──

    const gameHash = config.gameHash as `0x${string}` | undefined;
    let tokenAddresses: readonly Address[] = [];
    let tokenBalances: bigint[] = [];
    let amountsMatrix: bigint[][] = [];

    if (gameHash) {
      tokenAddresses = await getGameTokens(gameHash);
      tokenBalances = await Promise.all(
        tokenAddresses.map(token => getTokenBalanceOnChain(gameHash, token))
      );

      for (let w = 0; w < winners.length; w++) {
        const row: bigint[] = [];
        for (let t = 0; t < tokenAddresses.length; t++) {
          const balance = tokenBalances[t];
          const fee = (balance * BigInt(config.protocolFeeBps)) / BigInt(10000);
          const distributable = balance - fee;
          row.push((distributable * BigInt(structure[w])) / BigInt(100));
        }
        amountsMatrix.push(row);
      }

      // Assign rounding dust to first place
      for (let t = 0; t < tokenAddresses.length; t++) {
        const balance = tokenBalances[t];
        const fee = (balance * BigInt(config.protocolFeeBps)) / BigInt(10000);
        const distributable = balance - fee;
        const totalDistributed = amountsMatrix.reduce((sum, row) => sum + row[t], BigInt(0));
        const dust = distributable - totalDistributed;
        if (dust > BigInt(0)) amountsMatrix[0][t] += dust;
      }
    }

    // ── 5. Build finish data (txHash filled in by background task) ──

    const payoutsPerWinner = winners.map((w, wi) => ({
      address: w.address,
      name: w.name,
      chips: w.chips,
      rank: wi + 1,
      percent: structure[wi],
      tokens: tokenAddresses.map((token, ti) => ({
        token: token as string,
        amount: amountsMatrix[wi]?.[ti]?.toString() ?? '0',
      })),
    }));

    const finishData = {
      gameId,
      gameHash: gameHash ?? null,
      rankings: rankings.map((p, i) => ({
        address: p.address,
        name: p.name,
        chips: p.chips,
        rank: i + 1,
      })),
      payoutStructure: structure,
      winners: payoutsPerWinner,
      tokens: tokenAddresses.map((addr, i) => ({
        address: addr as string,
        escrowBalance: tokenBalances[i]?.toString() ?? '0',
      })),
      protocolFeeBps: config.protocolFeeBps,
      txHash: null,          // filled in by background task below
      pending: !!gameHash,   // true when on-chain call is in flight
      calldata: gameHash
        ? encodeCompleteGame(
            gameHash,
            winners.map(w => w.address as Address),
            [...tokenAddresses],
            amountsMatrix,
          )
        : null,
      finishedAt: Date.now(),
    };

    // ── 6. Persist finish data and update lobby status ──

    await redis.set(`craic:game:${gameId}:finish`, JSON.stringify(finishData));

    const lobbyEntries = await redis.zrange('craic:lobby', 0, -1);
    for (const entry of lobbyEntries) {
      const gameInfo: CraicGameInfo = typeof entry === 'string'
        ? JSON.parse(entry) : entry;
      if (gameInfo.gameId === gameId) {
        await redis.zrem('craic:lobby', JSON.stringify(gameInfo));
        await redis.zadd('craic:lobby', {
          score: gameInfo.createdAt,
          member: JSON.stringify({ ...gameInfo, status: 'finished' }),
        });
        break;
      }
    }

    // ── 7. Fire startGame() if needed, then completeGame() — fire-and-forget ──
    // waitUntil extends the Vercel function lifetime so both txs can broadcast
    // after the response is sent without blocking the client.
    //
    // Safeguard: the contract requires Open → Active → Completed in sequence.
    // If startGame() was never called on-chain (status === Open), call it first.

    if (gameHash && process.env.CLAIM_SIGNER_PRIVATE_KEY) {
      const signerKey = process.env.CLAIM_SIGNER_PRIVATE_KEY as `0x${string}`;
      const account = privateKeyToAccount(signerKey);
      const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

      waitUntil(
        (async () => {
          // Check on-chain status before broadcasting
          const onChainGame = await getGame(gameHash);
          // GameStatus enum: 0=Open, 1=Active, 2=Completed, 3=Cancelled
          const onChainStatus = onChainGame ? Number((onChainGame as Record<string, unknown>).status ?? -1) : -1;

          if (onChainStatus === 2) {
            // Already completed on-chain — just update Redis if txHash is missing
            console.log('[finish] game already Completed on-chain, skipping broadcast');
            return;
          }

          if (onChainStatus === 0) {
            // Open → must call startGame() first
            console.log('[finish] game is Open on-chain — calling startGame() first');
            const startHash = await walletClient.writeContract({
              address: CRAIC_CONTRACT_ADDRESS,
              abi: CRAIC_HOME_GAME_ABI,
              functionName: 'startGame',
              args: [gameHash],
            });
            console.log('[finish] startGame tx:', startHash);
            // Wait for startGame to confirm before completeGame
            const { createPublicClient } = await import('viem');
            const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
            await publicClient.waitForTransactionReceipt({ hash: startHash, timeout: 30000 });
            console.log('[finish] startGame confirmed');
          }

          // Game is now Active — broadcast completeGame()
          const txHash = await walletClient.writeContract({
            address: CRAIC_CONTRACT_ADDRESS,
            abi: CRAIC_HOME_GAME_ABI,
            functionName: 'completeGame',
            args: [
              gameHash,
              winners.map(w => w.address as Address),
              [...tokenAddresses],
              amountsMatrix,
            ],
          });
          console.log('[finish] completeGame tx:', txHash);

          // Update Redis with the confirmed tx hash
          const updated = { ...finishData, txHash, pending: false };
          await redis.set(`craic:game:${gameId}:finish`, JSON.stringify(updated));
          console.log('[finish] Redis updated with txHash');
        })().catch((err: unknown) => {
          console.error('[finish] background broadcast failed:', err);
        })
      );
    }

    // ── 8. Return immediately — client polls /api/craic/results for txHash ──

    return NextResponse.json({ success: true, pending: !!gameHash, finishData });

  } catch (error) {
    console.error('Error finishing Craic game:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to finish game' },
      { status: 500 }
    );
  }
}
