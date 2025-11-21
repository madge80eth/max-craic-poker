import { NextRequest, NextResponse } from 'next/server';
import { hasUserPlayedToday, storeDailyHand, getTodayHandResult, getUserTickets } from '@/lib/redis';

interface DealRequest {
  walletAddress: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DealRequest = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json({
        success: false,
        error: 'Wallet address required'
      }, { status: 400 });
    }

    // Check if user already played today
    const alreadyPlayed = await hasUserPlayedToday(walletAddress);

    if (alreadyPlayed) {
      // Return existing result
      const existingResult = await getTodayHandResult(walletAddress);
      const totalTickets = await getUserTickets(walletAddress);

      return NextResponse.json({
        success: true,
        alreadyPlayed: true,
        result: existingResult,
        totalTickets,
        message: "You've already played today! Come back tomorrow."
      });
    }

    // Generate and store new daily hand
    const { handResult, totalTickets } = await storeDailyHand(walletAddress);

    return NextResponse.json({
      success: true,
      alreadyPlayed: false,
      result: handResult,
      totalTickets,
      message: 'Hand dealt successfully!'
    });

  } catch (error) {
    console.error('Deal error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: String(error)
    }, { status: 500 });
  }
}
