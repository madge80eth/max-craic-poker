import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { checkAndResetSession } from '@/lib/session';
import { getActiveTournament, getTournamentResult } from '@/lib/tournament-redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(request: NextRequest) {
  try {
    // Auto-reset if session changed in tournaments.json
    await checkAndResetSession();

    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get('wallet');

    // Get total entries
    const entries = await redis.hgetall('raffle_entries');
    const totalEntries = entries ? Object.keys(entries).length : 0;

    // Get raffle winners data
    const winnersData = await redis.get('raffle_winners');
    let raffleWinners = null;

    if (winnersData) {
      const parsed = typeof winnersData === 'string' ? JSON.parse(winnersData) : winnersData;
      raffleWinners = parsed.winners || null;
    }

    // Get tournament winners
    const tournamentId = await getActiveTournament();
    let tournamentWinners = null;

    if (tournamentId) {
      const tournamentResult = await getTournamentResult(tournamentId);
      if (tournamentResult) {
        tournamentWinners = tournamentResult.winners;
      }
    }

    // Check if specific wallet requested
    if (walletAddress && entries) {
      const userEntryData = await redis.hget('raffle_entries', walletAddress);
      let userEntry = null;
      
      if (userEntryData) {
        userEntry = typeof userEntryData === 'string' ? JSON.parse(userEntryData) : userEntryData;
      }

      // Check if user is a raffle winner
      let raffleWinnerInfo = null;
      if (raffleWinners && Array.isArray(raffleWinners)) {
        raffleWinnerInfo = raffleWinners.find((w: any) =>
          w.walletAddress.toLowerCase() === walletAddress.toLowerCase()
        );
      }

      // Check if user is a tournament winner
      let tournamentWinnerInfo = null;
      if (tournamentWinners && Array.isArray(tournamentWinners)) {
        tournamentWinnerInfo = tournamentWinners.find((w: any) =>
          w.walletAddress.toLowerCase() === walletAddress.toLowerCase()
        );
      }

      return NextResponse.json({
        success: true,
        totalEntries,
        hasEntered: !!userEntry,
        userEntry,
        isRaffleWinner: !!raffleWinnerInfo,
        raffleWinnerInfo,
        isTournamentWinner: !!tournamentWinnerInfo,
        tournamentWinnerInfo,
        allWinners: {
          raffle: raffleWinners,
          tournament: tournamentWinners
        }
      });
    }

    // Return general status
    return NextResponse.json({
      success: true,
      totalEntries,
      allWinners: {
        raffle: raffleWinners,
        tournament: tournamentWinners
      }
    });

  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get status', error: String(error) },
      { status: 500 }
    );
  }
}