import { NextRequest, NextResponse } from 'next/server';
import { hasUserPlayedDraw, storeUserHand, getUserHandResult } from '@/lib/redis';
import { checkAndResetSession } from '@/lib/session';
import path from 'path';
import fs from 'fs';

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

    // Auto-reset if session changed
    await checkAndResetSession();

    // Get current sessionId from tournaments.json
    const tournamentsPath = path.join(process.cwd(), 'public', 'tournaments.json');
    const tournamentsFile = fs.readFileSync(tournamentsPath, 'utf-8');
    const tournamentsData = JSON.parse(tournamentsFile);
    const sessionId = tournamentsData.sessionId;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'No active session found'
      }, { status: 400 });
    }

    // Check if user already played this draw
    const alreadyPlayed = await hasUserPlayedDraw(walletAddress, sessionId);

    if (alreadyPlayed) {
      // Return existing result
      const existingResult = await getUserHandResult(walletAddress, sessionId);
      return NextResponse.json({
        success: true,
        alreadyPlayed: true,
        result: existingResult,
        message: "You've already played this draw!"
      });
    }

    // Generate and store new hand
    const result = await storeUserHand(walletAddress, sessionId);

    return NextResponse.json({
      success: true,
      alreadyPlayed: false,
      result,
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
