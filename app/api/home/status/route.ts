import { NextRequest, NextResponse } from 'next/server';
import { hasUserPlayedToday, recalculateTodayPlacement, getUserTickets } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json({
        success: false,
        error: 'Wallet address required'
      }, { status: 400 });
    }

    // Check if user played today
    const hasPlayedToday = await hasUserPlayedToday(walletAddress);

    // Get total accumulated tickets
    const totalTickets = await getUserTickets(walletAddress);

    if (!hasPlayedToday) {
      return NextResponse.json({
        success: true,
        hasPlayedToday: false,
        todayResult: null,
        totalTickets
      });
    }

    // Get today's result with recalculated placement
    const todayResult = await recalculateTodayPlacement(walletAddress);

    return NextResponse.json({
      success: true,
      hasPlayedToday: true,
      todayResult,
      totalTickets
    });

  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: String(error)
    }, { status: 500 });
  }
}
