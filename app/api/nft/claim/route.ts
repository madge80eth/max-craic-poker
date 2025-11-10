import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, monthKey } = body; // monthKey optional - for claiming past months

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, message: 'Wallet address required' },
        { status: 400 }
      );
    }

    let winningMonth = monthKey;
    let userRank = 0;
    let userEntries = 0;

    // If monthKey provided, check historical snapshot
    if (monthKey) {
      const snapshotData = await redis.get(`leaderboard_snapshot:${monthKey}`);

      if (!snapshotData) {
        return NextResponse.json(
          { success: false, message: 'No snapshot found for this month' },
          { status: 404 }
        );
      }

      const snapshot = typeof snapshotData === 'string' ? JSON.parse(snapshotData) : snapshotData;
      const winner = snapshot.top3.find((w: any) =>
        w.walletAddress.toLowerCase() === walletAddress.toLowerCase()
      );

      if (!winner) {
        return NextResponse.json(
          { success: false, message: 'Wallet was not in top 3 for this month' },
          { status: 403 }
        );
      }

      userRank = winner.rank;
      userEntries = winner.totalEntries;
    } else {
      // Check current month leaderboard
      const historyData = await redis.hgetall('entry_history');

      if (!historyData || Object.keys(historyData).length === 0) {
        return NextResponse.json(
          { success: false, message: 'No leaderboard data found' },
          { status: 404 }
        );
      }

      // Parse and sort entries
      const entries = Object.entries(historyData).map(([wallet, data]) => {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        return {
          walletAddress: wallet,
          totalEntries: parsed.totalEntries,
          rank: 0
        };
      });

      entries.sort((a, b) => b.totalEntries - a.totalEntries);
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      const userEntry = entries.find(e => e.walletAddress.toLowerCase() === walletAddress.toLowerCase());

      if (!userEntry || userEntry.rank > 3) {
        return NextResponse.json(
          { success: false, message: 'Wallet not eligible for NFT claim (must be top 3)' },
          { status: 403 }
        );
      }

      userRank = userEntry.rank;
      userEntries = userEntry.totalEntries;

      // Use current month
      const now = new Date();
      winningMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    // Check if already claimed for this specific month
    const claimedKey = `nft_claimed:${walletAddress.toLowerCase()}:${winningMonth}`;
    const alreadyClaimed = await redis.get(claimedKey);

    if (alreadyClaimed) {
      return NextResponse.json(
        { success: false, message: `NFT already claimed for ${winningMonth}` },
        { status: 400 }
      );
    }

    // Mark as claimed for this month
    await redis.set(claimedKey, {
      claimedAt: new Date().toISOString(),
      month: winningMonth,
      rank: userRank,
      totalEntries: userEntries
    });

    // TODO: Actual NFT minting logic would go here
    // For now, we just record the claim

    const monthName = new Date(`${winningMonth}-01`).toLocaleString('en-GB', { month: 'long', year: 'numeric' });

    return NextResponse.json({
      success: true,
      message: `Group Coaching NFT claimed for ${monthName}`,
      month: winningMonth,
      monthName,
      rank: userRank,
      note: 'Access granted to monthly group coaching session'
    });

  } catch (error) {
    console.error('NFT claim error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to claim NFT', error: String(error) },
      { status: 500 }
    );
  }
}

// Check if wallet has already claimed
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, message: 'Wallet address required' },
        { status: 400 }
      );
    }

    const claimedKey = `nft_claimed:${walletAddress.toLowerCase()}`;
    const claimData = await redis.get(claimedKey);

    return NextResponse.json({
      success: true,
      claimed: !!claimData,
      claimData: claimData || null
    });

  } catch (error) {
    console.error('NFT claim check error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to check NFT claim status' },
      { status: 500 }
    );
  }
}
