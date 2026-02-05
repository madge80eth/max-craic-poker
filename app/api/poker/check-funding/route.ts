import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbi, Address, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// Escrow address for receiving USDC
const ESCROW_ADDRESS = '0xCc7659fbE122AcdE826725cf3a4cd5dfD72763F0' as Address;

// USDC on Base
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address;

// ERC-20 Transfer event ABI
const TRANSFER_EVENT_ABI = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]);

// Create public client with fallback RPC URLs
const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});

/**
 * GET /api/poker/check-funding?tournamentId=xxx&sender=0x...&amount=100
 * Check if USDC has been received from sender for the expected amount
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournamentId');
    const senderAddress = searchParams.get('sender');
    const expectedAmountCents = parseInt(searchParams.get('amount') || '0');

    if (!tournamentId) {
      return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 });
    }

    // Get tournament from Redis
    const tournamentData = await redis.get(`poker:sponsored:${tournamentId}`);
    if (!tournamentData) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const tournament = typeof tournamentData === 'string'
      ? JSON.parse(tournamentData)
      : tournamentData;

    // If already funded, return immediately
    if (tournament.fundingConfirmed) {
      return NextResponse.json({
        success: true,
        funded: true,
        amount: tournament.prizePool,
        txHash: tournament.fundingTxHash || null,
      });
    }

    // Convert cents to USDC amount (6 decimals)
    const expectedAmountUsdc = BigInt(expectedAmountCents) * BigInt(10000); // cents to 6 decimals

    // Get recent Transfer events to the escrow address
    // Look back ~100 blocks (~3-4 minutes on Base)
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = currentBlock - BigInt(100);

    const logs = await publicClient.getLogs({
      address: USDC_ADDRESS,
      event: TRANSFER_EVENT_ABI[0],
      args: {
        to: ESCROW_ADDRESS,
        ...(senderAddress ? { from: senderAddress as Address } : {}),
      },
      fromBlock,
      toBlock: 'latest',
    });

    // Check for a matching transfer
    for (const log of logs) {
      const value = log.args.value as bigint;
      const from = log.args.from as Address;

      // Check if amount matches (within 1% tolerance for gas variations)
      const tolerance = expectedAmountUsdc / BigInt(100);
      const minAmount = expectedAmountUsdc - tolerance;
      const maxAmount = expectedAmountUsdc + tolerance;

      if (value >= minAmount && value <= maxAmount) {
        // Found matching transfer! Update tournament record
        const updatedTournament = {
          ...tournament,
          fundingConfirmed: true,
          fundingTxHash: log.transactionHash,
          fundingFrom: from,
          fundingAmount: Number(value),
          fundingConfirmedAt: Date.now(),
        };

        await redis.set(`poker:sponsored:${tournamentId}`, JSON.stringify(updatedTournament));

        return NextResponse.json({
          success: true,
          funded: true,
          amount: Number(formatUnits(value, 6)) * 100, // Convert to cents
          txHash: log.transactionHash,
          from,
        });
      }
    }

    // No matching transfer found yet
    return NextResponse.json({
      success: true,
      funded: false,
      escrowAddress: ESCROW_ADDRESS,
      expectedAmount: expectedAmountCents,
      message: 'Waiting for USDC transfer',
    });

  } catch (error) {
    console.error('Error checking funding:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check funding' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/poker/check-funding
 * Manually confirm funding (for admin use or when auto-detection fails)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tournamentId, txHash, amount } = body;

    if (!tournamentId) {
      return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 });
    }

    // Get tournament from Redis
    const tournamentData = await redis.get(`poker:sponsored:${tournamentId}`);
    if (!tournamentData) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const tournament = typeof tournamentData === 'string'
      ? JSON.parse(tournamentData)
      : tournamentData;

    // Update tournament as funded
    const updatedTournament = {
      ...tournament,
      fundingConfirmed: true,
      fundingTxHash: txHash || null,
      fundingAmount: amount || tournament.prizePool,
      fundingConfirmedAt: Date.now(),
    };

    await redis.set(`poker:sponsored:${tournamentId}`, JSON.stringify(updatedTournament));

    return NextResponse.json({
      success: true,
      funded: true,
      tournament: updatedTournament,
    });

  } catch (error) {
    console.error('Error confirming funding:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to confirm funding' },
      { status: 500 }
    );
  }
}
