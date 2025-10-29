import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { getCurrentMonth, isWithinClaimWindow, getClaimDeadline } from '@/lib/nft';

interface LeaderboardSnapshot {
  month: string;
  snapshotDate: string;
  topWallets: Array<{
    walletAddress: string;
    rank: number;
    totalEntries: number;
  }>;
}

interface EligibleClaim {
  month: string;
  rank: number;
  totalEntries: number;
  claimed: boolean;
  claimDeadline: string;
  withinWindow: boolean;
}

/**
 * GET /api/nft/eligibility?wallet=0x...
 * Check if a wallet is eligible to claim NFTs from any month
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    // Get all snapshot months
    const snapshotMonths = await redis.get('leaderboard_snapshots') as string[] || [];

    if (snapshotMonths.length === 0) {
      return NextResponse.json({
        success: true,
        eligible: false,
        eligibleClaims: [],
        message: 'No leaderboard snapshots available',
      });
    }

    // Check each snapshot for this wallet
    const eligibleClaims: EligibleClaim[] = [];

    for (const month of snapshotMonths) {
      const snapshot = await redis.hgetall(`leaderboard_snapshot:${month}`) as unknown as LeaderboardSnapshot;

      if (!snapshot || !snapshot.topWallets) continue;

      // Find wallet in top 5
      const walletEntry = snapshot.topWallets.find(
        (w) => w.walletAddress.toLowerCase() === wallet.toLowerCase()
      );

      if (walletEntry) {
        // Check if already claimed
        const claimRecord = await redis.hget(`nft_claims`, `${wallet.toLowerCase()}:${month}`);
        const claimed = !!claimRecord;

        eligibleClaims.push({
          month,
          rank: walletEntry.rank,
          totalEntries: walletEntry.totalEntries,
          claimed,
          claimDeadline: getClaimDeadline(month),
          withinWindow: isWithinClaimWindow(month),
        });
      }
    }

    // Filter to only show claimable (not claimed and within window)
    const claimableNFTs = eligibleClaims.filter(c => !c.claimed && c.withinWindow);

    return NextResponse.json({
      success: true,
      eligible: claimableNFTs.length > 0,
      eligibleClaims,
      claimableNFTs,
      totalEligible: eligibleClaims.length,
      totalClaimable: claimableNFTs.length,
    });
  } catch (error) {
    console.error('Error checking NFT eligibility:', error);
    return NextResponse.json(
      { error: 'Failed to check eligibility' },
      { status: 500 }
    );
  }
}
