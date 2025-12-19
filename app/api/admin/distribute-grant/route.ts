// app/api/admin/distribute-grant/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  createGrantDistribution,
  getGrantDistribution,
  markGrantDistributed,
  getAllGrantDistributions,
  getActiveFounders,
  getTotalGrantsDistributed
} from '@/lib/founder-grants';
import { getCreator } from '@/lib/creator-redis';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/distribute-grant
 * Get all grant distributions and summary stats
 */
export async function GET() {
  try {
    const [distributions, totalDistributed, activeFounders] = await Promise.all([
      getAllGrantDistributions(50),
      getTotalGrantsDistributed(),
      getActiveFounders()
    ]);

    // Get founder details
    const founderDetails = await Promise.all(
      activeFounders.map(async (id) => {
        const creator = await getCreator(id);
        return creator ? {
          id: creator.id,
          name: creator.name,
          walletAddress: creator.walletAddress,
          tier: creator.tier
        } : null;
      })
    );

    return NextResponse.json({
      success: true,
      distributions,
      stats: {
        totalDistributed,
        activeFounderCount: activeFounders.length,
        distributionCount: distributions.length
      },
      founders: founderDetails.filter(f => f !== null)
    });
  } catch (error) {
    console.error('Error fetching grant distributions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grant distributions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/distribute-grant
 * Create a new grant distribution
 *
 * Body: {
 *   totalGrantAmount: number (in cents)
 *   notes?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { totalGrantAmount, notes } = body;

    // Validate input
    if (!totalGrantAmount || totalGrantAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid grant amount' },
        { status: 400 }
      );
    }

    // Create distribution record
    const distribution = await createGrantDistribution(totalGrantAmount, notes);

    return NextResponse.json({
      success: true,
      distribution,
      message: `Grant distribution created: $${(distribution.founderShareAmount / 100).toFixed(2)} split among ${distribution.founderCount} founders`
    });
  } catch (error) {
    console.error('Error creating grant distribution:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create grant distribution' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/distribute-grant
 * Mark a grant distribution as distributed
 *
 * Body: {
 *   distributionId: string
 *   txHashes: string[] (on-chain transaction hashes)
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { distributionId, txHashes } = body;

    // Validate input
    if (!distributionId) {
      return NextResponse.json(
        { error: 'Distribution ID is required' },
        { status: 400 }
      );
    }

    if (!txHashes || !Array.isArray(txHashes) || txHashes.length === 0) {
      return NextResponse.json(
        { error: 'Transaction hashes are required' },
        { status: 400 }
      );
    }

    // Mark as distributed
    await markGrantDistributed(distributionId, txHashes);

    // Get updated distribution
    const distribution = await getGrantDistribution(distributionId);

    return NextResponse.json({
      success: true,
      distribution,
      message: 'Grant distribution marked as completed'
    });
  } catch (error) {
    console.error('Error marking grant as distributed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update grant distribution' },
      { status: 500 }
    );
  }
}
