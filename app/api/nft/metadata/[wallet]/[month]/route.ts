import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

/**
 * GET /api/nft/metadata/[wallet]/[month]
 * Get NFT metadata for a specific wallet and month
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wallet: string; month: string }> }
) {
  try {
    const { wallet, month } = await params;

    if (!wallet || !month) {
      return NextResponse.json(
        { error: 'Wallet and month required' },
        { status: 400 }
      );
    }

    // Get metadata from Redis
    const metadataKey = `nft_metadata:${wallet.toLowerCase()}:${month}`;
    const metadataStr = await redis.get(metadataKey);

    if (!metadataStr) {
      return NextResponse.json(
        { error: 'Metadata not found' },
        { status: 404 }
      );
    }

    const metadata = typeof metadataStr === 'string'
      ? JSON.parse(metadataStr)
      : metadataStr;

    // Return metadata as JSON (standard for NFT metadata URIs)
    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Error fetching NFT metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}
