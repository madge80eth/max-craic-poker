import { NextRequest, NextResponse } from 'next/server';
import { hasUserPlayedDraw, recalculatePlacement } from '@/lib/redis';
import { checkAndResetSession } from '@/lib/session';
import path from 'path';
import fs from 'fs';

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

    // Auto-reset if session changed
    await checkAndResetSession();

    // Get current sessionId from tournaments.json
    const tournamentsPath = path.join(process.cwd(), 'public', 'tournaments.json');
    const tournamentsFile = fs.readFileSync(tournamentsPath, 'utf-8');
    const tournamentsData = JSON.parse(tournamentsFile);
    const sessionId = tournamentsData.sessionId;

    if (!sessionId) {
      return NextResponse.json({
        success: true,
        hasPlayed: false,
        sessionId: null,
        result: null
      });
    }

    // Check if user played this draw
    const hasPlayed = await hasUserPlayedDraw(walletAddress, sessionId);

    if (!hasPlayed) {
      return NextResponse.json({
        success: true,
        hasPlayed: false,
        sessionId,
        result: null
      });
    }

    // Get user's result with recalculated placement
    const result = await recalculatePlacement(walletAddress, sessionId);

    return NextResponse.json({
      success: true,
      hasPlayed: true,
      sessionId,
      result
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
