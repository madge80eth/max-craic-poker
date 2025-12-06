import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const runtime = 'edge';

// Clear session results (call this when starting new stream)
export async function POST(req: NextRequest) {
  try {
    await redis.del('hoth:session_results');
    await redis.del('hoth:active');

    console.log('🔄 Cleared Hand of the Hour session');

    return NextResponse.json({
      success: true,
      message: 'Session cleared'
    });

  } catch (error) {
    console.error('Error clearing session:', error);
    return NextResponse.json(
      { error: 'Failed to clear session' },
      { status: 500 }
    );
  }
}
