import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'sessionId is required' },
        { status: 400 }
      );
    }

    const tipKey = `session:${sessionId}:tips`;
    const totalKey = `session:${sessionId}:tips_total`;

    // Get total tips
    const totalTips = await redis.get(totalKey);
    const totalAmount = parseInt(totalTips as string || '0');

    // Get recent tips (last 10)
    const tipsData = await redis.lrange(tipKey, -10, -1);
    const recentTips = tipsData
      .map((tip: string) => {
        try {
          return JSON.parse(tip);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reverse(); // Most recent first

    const tipCount = await redis.llen(tipKey);

    return NextResponse.json({
      success: true,
      totalTips: totalAmount, // in cents
      tipCount,
      recentTips
    });

  } catch (error) {
    console.error('❌ Tips fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch tips', error: String(error) },
      { status: 500 }
    );
  }
}
