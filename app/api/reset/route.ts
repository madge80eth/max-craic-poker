// app/api/reset/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    // Clear all existing data
    await redis.del('entries');
    await redis.del('current_winner'); 
    await redis.del('draw_time');
    await redis.del('community_tournament');

    // Set new 12-hour countdown (43200 seconds = 12 hours)
    const drawTime = Date.now() + (12 * 60 * 60 * 1000);
    await redis.set('draw_time', drawTime.toString());

    return NextResponse.json({
      success: true,
      message: 'System reset successfully. Ready for new raffle session.',
      drawTime: drawTime,
      countdown: '12:00:00'
    });

  } catch (error) {
    console.error('Reset error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Just return current system status
    const entries = await redis.hgetall('entries');
    const winner = await redis.hgetall('current_winner');
    const drawTime = await redis.get('draw_time');
    
    const totalEntries = Object.keys(entries || {}).length;
    const hasWinner = winner && Object.keys(winner).length > 0;
    const timeRemaining = drawTime ? Math.max(0, Math.floor((parseInt(drawTime) - Date.now()) / 1000)) : 0;

    return NextResponse.json({
      success: true,
      totalEntries,
      hasWinner,
      timeRemaining,
      drawTime: drawTime ? parseInt(drawTime) : null
    });

  } catch (error) {
    console.error('Get reset status error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}