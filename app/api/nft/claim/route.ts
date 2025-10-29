import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { generateNFTMetadata, isWithinClaimWindow } from '@/lib/nft';

interface LeaderboardSnapshot {
  month: string;
  snapshotDate: string;
  topWallets: Array<{
    walletAddress: string;
    rank: number;
    totalEntries: number;
  }>;
}

interface NFTClaimRecord {
  walletAddress: string;
  month: string;
  rank: number;
  claimedAt: string;
  tokenId?: number;
  metadataUri?: string;
  transactionHash?: string;
}

/**
 * POST /api/nft/claim
 * Claim an NFT for a specific month
 * This will prepare the claim and return metadata
 * The actual minting happens via the smart contract (called from frontend)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, month } = body;

    if (!walletAddress || !month) {
      return NextResponse.json(
        { error: 'Wallet address and month required' },
        { status: 400 }
      );
    }

    const wallet = walletAddress.toLowerCase();

    // Check if month snapshot exists
    const snapshot = await redis.hgetall(`leaderboard_snapshot:${month}`) as unknown as LeaderboardSnapshot;

    if (!snapshot || !snapshot.topWallets) {
      return NextResponse.json(
        { error: 'No snapshot found for this month' },
        { status: 404 }
      );
    }

    // Check if wallet is in top 5
    const walletEntry = snapshot.topWallets.find(
      (w) => w.walletAddress.toLowerCase() === wallet
    );

    if (!walletEntry) {
      return NextResponse.json(
        { error: 'Wallet not in top 5 for this month' },
        { status: 403 }
      );
    }

    // Check if already claimed
    const existingClaim = await redis.hget(`nft_claims`, `${wallet}:${month}`);

    if (existingClaim) {
      return NextResponse.json(
        { error: 'NFT already claimed for this month' },
        { status: 409 }
      );
    }

    // Check if within claim window
    if (!isWithinClaimWindow(month)) {
      return NextResponse.json(
        { error: 'Claim window has expired for this month' },
        { status: 403 }
      );
    }

    // Generate NFT metadata
    const metadata = generateNFTMetadata(walletEntry.rank, month);

    // Store metadata in Redis
    const metadataKey = `nft_metadata:${wallet}:${month}`;
    await redis.set(metadataKey, JSON.stringify(metadata));

    // Create metadata URI (in production, this would be IPFS or similar)
    const metadataUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://max-craic-poker.vercel.app'}/api/nft/metadata/${wallet}/${month}`;

    // Create claim record (pending minting)
    const claimRecord: NFTClaimRecord = {
      walletAddress: wallet,
      month,
      rank: walletEntry.rank,
      claimedAt: new Date().toISOString(),
      metadataUri,
    };

    // Store claim record
    await redis.hset(`nft_claims`, {
      [`${wallet}:${month}`]: JSON.stringify(claimRecord),
    });

    return NextResponse.json({
      success: true,
      message: 'NFT claim prepared',
      claim: claimRecord,
      metadata,
      metadataUri,
      rank: walletEntry.rank,
    });
  } catch (error) {
    console.error('Error claiming NFT:', error);
    return NextResponse.json(
      { error: 'Failed to claim NFT' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/nft/claim
 * Update claim record with token ID and transaction hash after minting
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, month, tokenId, transactionHash } = body;

    if (!walletAddress || !month) {
      return NextResponse.json(
        { error: 'Wallet address and month required' },
        { status: 400 }
      );
    }

    const wallet = walletAddress.toLowerCase();

    // Get existing claim
    const existingClaimStr = await redis.hget(`nft_claims`, `${wallet}:${month}`);

    if (!existingClaimStr) {
      return NextResponse.json(
        { error: 'No claim found' },
        { status: 404 }
      );
    }

    const existingClaim = JSON.parse(existingClaimStr as string) as NFTClaimRecord;

    // Update claim record
    const updatedClaim: NFTClaimRecord = {
      ...existingClaim,
      tokenId,
      transactionHash,
    };

    await redis.hset(`nft_claims`, {
      [`${wallet}:${month}`]: JSON.stringify(updatedClaim),
    });

    return NextResponse.json({
      success: true,
      message: 'Claim updated with minting details',
      claim: updatedClaim,
    });
  } catch (error) {
    console.error('Error updating claim:', error);
    return NextResponse.json(
      { error: 'Failed to update claim' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/nft/claim?wallet=0x...&month=2025-10
 * Get claim status for a specific wallet and month
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const wallet = searchParams.get('wallet');
    const month = searchParams.get('month');

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    const walletLower = wallet.toLowerCase();

    if (month) {
      // Get specific month claim
      const claimStr = await redis.hget(`nft_claims`, `${walletLower}:${month}`);

      if (!claimStr) {
        return NextResponse.json({
          success: true,
          claimed: false,
        });
      }

      const claim = JSON.parse(claimStr as string) as NFTClaimRecord;

      return NextResponse.json({
        success: true,
        claimed: true,
        claim,
      });
    }

    // Get all claims for wallet
    const allClaims = await redis.hgetall(`nft_claims`);
    const walletClaims: NFTClaimRecord[] = [];

    if (allClaims) {
      for (const [key, value] of Object.entries(allClaims)) {
        if (key.startsWith(`${walletLower}:`)) {
          const claim = typeof value === 'string' ? JSON.parse(value) : value as NFTClaimRecord;
          walletClaims.push(claim);
        }
      }
    }

    return NextResponse.json({
      success: true,
      claims: walletClaims,
      totalClaims: walletClaims.length,
    });
  } catch (error) {
    console.error('Error fetching claim:', error);
    return NextResponse.json(
      { error: 'Failed to fetch claim' },
      { status: 500 }
    );
  }
}
