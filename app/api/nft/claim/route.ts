import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, message: 'Wallet address required' },
        { status: 400 }
      );
    }

    // Get leaderboard to verify wallet is in top 3
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

    // Check if wallet is in top 3
    const userEntry = entries.find(e => e.walletAddress.toLowerCase() === walletAddress.toLowerCase());

    if (!userEntry || userEntry.rank > 3) {
      return NextResponse.json(
        { success: false, message: 'Wallet not eligible for NFT claim (must be top 3)' },
        { status: 403 }
      );
    }

    // Check if already claimed
    const claimedKey = `nft_claimed:${walletAddress.toLowerCase()}`;
    const alreadyClaimed = await redis.get(claimedKey);

    if (alreadyClaimed) {
      return NextResponse.json(
        { success: false, message: 'NFT already claimed for this wallet' },
        { status: 400 }
      );
    }

    // Mark as claimed (in production, this is where you'd mint/transfer the NFT)
    await redis.set(claimedKey, {
      claimedAt: new Date().toISOString(),
      rank: userEntry.rank,
      totalEntries: userEntry.totalEntries
    });

    // TODO: Actual NFT minting logic would go here
    // For now, we just record the claim

    return NextResponse.json({
      success: true,
      message: 'NFT claim recorded successfully',
      rank: userEntry.rank,
      // In production, return NFT token ID or transaction hash
      note: 'NFT minting will be implemented - claim recorded'
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
