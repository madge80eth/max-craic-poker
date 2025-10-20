import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    // Clear all data using consistent keys
    await redis.del('entries');
    await redis.del('winners');

    return NextResponse.json({
      success: true,
      message: 'System reset successfully. Ready for new raffle session.',
      cleared: ['entries', 'winners']
    });

  } catch (error) {
    console.error('Reset error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: String(error)
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return current system status
    const entries = await redis.hgetall('entries');
    const winnersData = await redis.get('winners');
    
    const totalEntries = entries ? Object.keys(entries).length : 0;
    
    let winners = null;
    if (winnersData) {
      const parsed = typeof winnersData === 'string' ? JSON.parse(winnersData) : winnersData;
      winners = parsed.winners || null;
    }

    return NextResponse.json({
      success: true,
      totalEntries,
      hasWinner: !!winners,
      winnersCount: winners ? winners.length : 0
    });

  } catch (error) {
    console.error('Get reset status error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: String(error)
    }, { status: 500 });
  }
}