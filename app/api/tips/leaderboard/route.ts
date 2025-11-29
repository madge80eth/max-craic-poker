import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'sessionId is required' },
        { status: 400 }
      );
    }

    const tipKey = `session:${sessionId}:tips`;

    // Get all tips for this session
    const tipsData = await redis.lrange(tipKey, 0, -1);

    if (!tipsData || tipsData.length === 0) {
      return NextResponse.json({
        success: true,
        leaderboard: [],
        totalTippers: 0
      });
    }

    // Parse tips and aggregate by wallet
    const tipsByWallet: Record<string, { walletAddress: string; totalAmount: number; tipCount: number; lastTip: number }> = {};

    for (const tipStr of tipsData) {
      try {
        const tip = typeof tipStr === 'string' ? JSON.parse(tipStr) : tipStr;

        if (!tipsByWallet[tip.walletAddress]) {
          tipsByWallet[tip.walletAddress] = {
            walletAddress: tip.walletAddress,
            totalAmount: 0,
            tipCount: 0,
            lastTip: 0
          };
        }

        tipsByWallet[tip.walletAddress].totalAmount += tip.amount;
        tipsByWallet[tip.walletAddress].tipCount += 1;
        tipsByWallet[tip.walletAddress].lastTip = Math.max(
          tipsByWallet[tip.walletAddress].lastTip,
          tip.timestamp
        );
      } catch (err) {
        console.error('Failed to parse tip:', err);
      }
    }

    // Convert to array and sort by total amount
    const leaderboard = Object.values(tipsByWallet)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, limit)
      .map((tipper, index) => ({
        rank: index + 1,
        walletAddress: tipper.walletAddress,
        totalAmount: tipper.totalAmount,
        tipCount: tipper.tipCount,
        lastTipTimestamp: tipper.lastTip
      }));

    return NextResponse.json({
      success: true,
      leaderboard,
      totalTippers: Object.keys(tipsByWallet).length
    });

  } catch (error) {
    console.error('❌ Leaderboard fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch leaderboard', error: String(error) },
      { status: 500 }
    );
  }
}
