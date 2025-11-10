import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { verifyWalletShared } from '@/lib/neynar';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, sessionId } = await request.json();

    if (!walletAddress) {
      return NextResponse.json({
        success: false,
        error: 'Wallet address required'
      }, { status: 400 });
    }

    // Get current entry
    const existingEntry = await redis.hget('raffle_entries', walletAddress);

    if (!existingEntry) {
      return NextResponse.json({
        success: false,
        error: 'No entry found for this wallet'
      }, { status: 404 });
    }

    // VERIFY with Neynar that they actually shared
    console.log(`🔍 Verifying share for wallet: ${walletAddress}`);
    const hasShared = await verifyWalletShared(walletAddress, 'max-craic-poker.vercel.app');

    if (!hasShared) {
      return NextResponse.json({
        success: false,
        error: 'Share not verified. Please cast with the Max Craic Poker link and try again.',
        verified: false
      }, { status: 400 });
    }

    // Parse and update entry with shared status FOR THIS SESSION
    const entry = typeof existingEntry === 'string' ? JSON.parse(existingEntry) : existingEntry;
    entry.hasShared = true;
    entry.sharedSessionId = sessionId; // Track which session they shared
    entry.verifiedAt = new Date().toISOString();

    // Store updated entry
    await redis.hset('raffle_entries', { [walletAddress]: JSON.stringify(entry) });

    console.log(`✅ Share verified and recorded for wallet: ${walletAddress}`);

    return NextResponse.json({
      success: true,
      message: 'Share verified! Your profit share will be doubled if you win.',
      verified: true
    });

  } catch (error) {
    console.error('Share tracking error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: String(error)
    }, { status: 500 });
  }
}
