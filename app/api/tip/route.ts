import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, walletAddress, sessionId, txHash } = body;

    // Validate required fields
    if (!amount || !walletAddress || !sessionId || !txHash) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate amount is positive number
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Create tip object
    const tip = {
      walletAddress,
      amount, // in cents
      timestamp: Date.now(),
      txHash
    };

    // Store tip in Redis
    const tipKey = `session:${sessionId}:tips`;
    const totalKey = `session:${sessionId}:tips_total`;

    // Add tip to list
    await redis.rpush(tipKey, JSON.stringify(tip));

    // Update total
    const currentTotal = await redis.get(totalKey);
    const newTotal = (parseInt(currentTotal as string || '0')) + amount;
    await redis.set(totalKey, newTotal);

    console.log(`💰 Tip recorded: ${walletAddress} tipped $${(amount / 100).toFixed(2)} (session: ${sessionId})`);

    return NextResponse.json({
      success: true,
      message: `Thanks for the tip! $${(amount / 100).toFixed(2)} sent`,
      totalTips: newTotal
    });

  } catch (error) {
    console.error('❌ Tip recording error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to record tip', error: String(error) },
      { status: 500 }
    );
  }
}
