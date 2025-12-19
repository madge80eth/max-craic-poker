// app/api/admin/set-founder/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCreator, updateCreator } from '@/lib/creator-redis';
import { createFounderOverride, createStrategicAdvisorOverride } from '@/lib/tier-calculator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/set-founder
 * Set founder status for a creator
 *
 * Body: {
 *   creatorId: string
 *   isFounder: boolean
 *   founderType?: 'standard' | 'strategic_advisor' (default: 'standard')
 * }
 *
 * Standard founders: 6-month Tier 1 override, then performance-based
 * Strategic advisors (Jaylee): Permanent Tier 1
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { creatorId, isFounder, founderType = 'standard' } = body;

    // Validate input
    if (!creatorId) {
      return NextResponse.json(
        { error: 'Creator ID is required' },
        { status: 400 }
      );
    }

    if (typeof isFounder !== 'boolean') {
      return NextResponse.json(
        { error: 'isFounder must be a boolean' },
        { status: 400 }
      );
    }

    // Get creator
    const creator = await getCreator(creatorId);
    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Prepare updates
    const updates: any = {
      isFounder
    };

    if (isFounder) {
      // Setting as founder - add tier override
      if (founderType === 'strategic_advisor') {
        updates.tierOverride = createStrategicAdvisorOverride();
        updates.tier = 1; // Permanent Tier 1
      } else {
        updates.tierOverride = createFounderOverride();
        updates.tier = 1; // 6-month Tier 1 override
      }

      console.log(`✅ Setting ${creator.name} as ${founderType} founder`);
    } else {
      // Removing founder status - clear override
      updates.tierOverride = undefined;
      console.log(`ℹ️ Removing founder status from ${creator.name}`);
    }

    // Update creator
    await updateCreator(creatorId, updates);

    // Get updated creator
    const updatedCreator = await getCreator(creatorId);

    return NextResponse.json({
      success: true,
      message: isFounder
        ? `${creator.name} set as ${founderType} founder with Tier 1 (90/10 split)`
        : `Founder status removed from ${creator.name}`,
      creator: {
        id: updatedCreator!.id,
        name: updatedCreator!.name,
        isFounder: updatedCreator!.isFounder,
        tier: updatedCreator!.tier,
        tierOverride: updatedCreator!.tierOverride
      }
    });
  } catch (error) {
    console.error('Error setting founder status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set founder status' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/set-founder
 * Get list of all founders
 */
export async function GET() {
  try {
    const { getAllCreators } = await import('@/lib/creator-redis');
    const allCreators = await getAllCreators();

    const founders = allCreators
      .filter(c => c.isFounder)
      .map(c => ({
        id: c.id,
        name: c.name,
        tier: c.tier,
        tierOverride: c.tierOverride,
        walletAddress: c.walletAddress,
        createdAt: c.createdAt
      }));

    return NextResponse.json({
      success: true,
      founders,
      count: founders.length
    });
  } catch (error) {
    console.error('Error fetching founders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch founders' },
      { status: 500 }
    );
  }
}
