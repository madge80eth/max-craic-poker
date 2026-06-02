import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createWalletClient, http, Address, Hash, keccak256, encodePacked } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { CraicGameConfig } from '@/lib/craic/types';
import { GameState } from '@/lib/poker/types';

const redis = Redis.fromEnv();

const SIGNER_KEY = process.env.CLAIM_SIGNER_PRIVATE_KEY as `0x${string}`;
const ADMIN_KEY = process.env.ADMIN_RESET_KEY;

if (!SIGNER_KEY) {
  console.error('CLAIM_SIGNER_PRIVATE_KEY not set');
}

const account = SIGNER_KEY ? privateKeyToAccount(SIGNER_KEY) : null;

/**
 * POST /api/craic/sign-claim
 *
 * Signs a claim message for a game winner. The signature allows the winner
 * to call claim() on the CraicHomeGame contract and collect their USDC payout.
 *
 * Auth: requires adminKey matching ADMIN_RESET_KEY (server-to-server).
 *       In production, this should be called by the game engine after determining winners,
 *       NOT directly by the frontend.
 *
 * Input:  { gameId, playerAddress, amount, gameHash, chainId, contractAddress, adminKey }
 * Output: { signature, signer }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId, playerAddress, amount, gameHash, chainId, contractAddress, adminKey } = body;

    // ── Auth ──
    if (!adminKey || adminKey !== ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Validate inputs ──
    if (!gameId || !playerAddress || !amount || !gameHash || !chainId || !contractAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!account) {
      return NextResponse.json({ error: 'Signer not configured' }, { status: 500 });
    }

    // ── Validate game is completed ──
    const configJson = await redis.get(`craic:game:${gameId}:config`);
    if (!configJson) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const finishJson = await redis.get(`craic:game:${gameId}:finish`);
    if (!finishJson) {
      return NextResponse.json({ error: 'Game not finished' }, { status: 400 });
    }
    const finishData = typeof finishJson === 'string' ? JSON.parse(finishJson) : finishJson;

    // ── Validate player is a legit winner with the claimed amount ──
    const payouts = finishData.payouts;
    let isLegitWinner = false;

    if (
      payouts.winner &&
      payouts.winner.address.toLowerCase() === playerAddress.toLowerCase()
    ) {
      // Verify amount matches expected payout (prize only, no bond in new model)
      const expectedAmount = payouts.winner.prize;
      if (Number(amount) === expectedAmount) {
        isLegitWinner = true;
      }
    }

    if (
      !isLegitWinner &&
      payouts.second &&
      payouts.second.address.toLowerCase() === playerAddress.toLowerCase()
    ) {
      const expectedAmount = payouts.second.prize;
      if (Number(amount) === expectedAmount) {
        isLegitWinner = true;
      }
    }

    if (!isLegitWinner) {
      return NextResponse.json(
        { error: 'Player is not a winner or amount does not match' },
        { status: 403 }
      );
    }

    // ── Sign the claim message ──
    // Must match the contract's claim() verifier:
    //   keccak256(abi.encodePacked(gameHash, playerAddress, amount, chainId, contractAddress))
    const messageHash = keccak256(
      encodePacked(
        ['bytes32', 'address', 'uint256', 'uint256', 'address'],
        [
          gameHash as Hash,
          playerAddress as Address,
          BigInt(amount),
          BigInt(chainId),
          contractAddress as Address,
        ]
      )
    );

    // EIP-191 personal sign (matches toEthSignedMessageHash in contract)
    const signature = await account.signMessage({
      message: { raw: messageHash as `0x${string}` },
    });

    return NextResponse.json({
      success: true,
      signature,
      signer: account.address,
    });
  } catch (error) {
    console.error('Error signing claim:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sign claim' },
      { status: 500 }
    );
  }
}
