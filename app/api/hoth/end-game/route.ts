import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    // 1. Finalize any active hand first
    const activeHandData = await redis.get('hoth:active');
    if (activeHandData) {
      const hand = typeof activeHandData === 'string'
        ? JSON.parse(activeHandData)
        : activeHandData;

      // Get current session results
      const resultsData = await redis.get('hoth:session_results');
      let results: Record<string, number> = {};
      if (resultsData) {
        results = typeof resultsData === 'string'
          ? JSON.parse(resultsData)
          : resultsData;
      }

      // Check votes against outcome
      for (const [wallet, vote] of Object.entries(hand.votes as Record<string, string>)) {
        if (vote === hand.outcome) {
          results[wallet] = (results[wallet] || 0) + 1;
        }
      }

      // Update session results
      await redis.set('hoth:session_results', JSON.stringify(results));

      // Clear active hand
      await redis.del('hoth:active');

      console.log(`✅ Finalized active hand ${hand.id} during end game`);
    }

    // 2. Get final session results
    const resultsData = await redis.get('hoth:session_results');
    let results: Record<string, number> = {};
    if (resultsData) {
      results = typeof resultsData === 'string'
        ? JSON.parse(resultsData)
        : resultsData;
    }

    // 3. Convert to leaderboard and get top 5
    const leaderboard = Object.entries(results)
      .map(([wallet, correct]) => ({
        wallet,
        correctPredictions: correct
      }))
      .sort((a, b) => b.correctPredictions - a.correctPredictions)
      .slice(0, 5); // Top 5

    // 4. Push to winners listing
    // Get existing winners list
    const winnersData = await redis.get('winners');
    let winners: any[] = [];
    if (winnersData) {
      winners = typeof winnersData === 'string'
        ? JSON.parse(winnersData)
        : winnersData;
    }

    // Add HOTH winners to the list
    const timestamp = Date.now();
    const hothWinners = leaderboard.map((player, index) => ({
      id: `hoth_${timestamp}_${index}`,
      wallet: player.wallet,
      tournament: 'Hand of the Hour',
      position: index + 1,
      usdcAmount: 0, // HOTH doesn't have payouts
      timestamp: timestamp,
      correctPredictions: player.correctPredictions,
      gameType: 'hoth'
    }));

    // Prepend to winners list (most recent first)
    winners = [...hothWinners, ...winners];

    // Keep only last 100 winners to prevent unbounded growth
    if (winners.length > 100) {
      winners = winners.slice(0, 100);
    }

    // Save updated winners list
    await redis.set('winners', JSON.stringify(winners));

    // 5. Clear session results
    await redis.del('hoth:session_results');

    console.log(`🏁 HOTH game ended. Top 5 winners added to winners listing.`);

    return NextResponse.json({
      success: true,
      topPlayers: leaderboard,
      message: `Game ended successfully. ${leaderboard.length} winners added to listing.`
    });

  } catch (error) {
    console.error('Error ending HOTH game:', error);
    return NextResponse.json(
      { error: 'Failed to end game' },
      { status: 500 }
    );
  }
}
