// app/api/admin/tier-recalculate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCreator, updateCreator } from '@/lib/creator-redis';
import { updateTierIfNeeded } from '@/lib/tier-calculator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/tier-recalculate
 * Force recalculate tier for a creator (or all creators)
 *
 * Body: {
 *   creatorId?: string (if omitted, recalculates all creators)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { creatorId } = body;

    if (creatorId) {
      // Recalculate single creator
      const creator = await getCreator(creatorId);
      if (!creator) {
        return NextResponse.json(
          { error: 'Creator not found' },
          { status: 404 }
        );
      }

      const { needsUpdate, newTier } = updateTierIfNeeded(creator);

      if (needsUpdate) {
        await updateCreator(creatorId, {
          tier: newTier,
          lastTierRecalculation: Date.now()
        });

        return NextResponse.json({
          success: true,
          message: `Tier updated from ${creator.tier} to ${newTier}`,
          creator: {
            id: creator.id,
            name: creator.name,
            oldTier: creator.tier,
            newTier
          }
        });
      } else {
        return NextResponse.json({
          success: true,
          message: 'No tier update needed',
          creator: {
            id: creator.id,
            name: creator.name,
            tier: creator.tier
          }
        });
      }
    } else {
      // Recalculate all creators (admin bulk operation)
      const { getAllCreators } = await import('@/lib/creator-redis');
      const allCreators = await getAllCreators();

      const updates = await Promise.all(
        allCreators.map(async (creator) => {
          const { needsUpdate, newTier } = updateTierIfNeeded(creator);

          if (needsUpdate) {
            await updateCreator(creator.id, {
              tier: newTier,
              lastTierRecalculation: Date.now()
            });

            return {
              id: creator.id,
              name: creator.name,
              oldTier: creator.tier,
              newTier,
              updated: true
            };
          }

          return {
            id: creator.id,
            name: creator.name,
            tier: creator.tier,
            updated: false
          };
        })
      );

      const updatedCount = updates.filter(u => u.updated).length;

      return NextResponse.json({
        success: true,
        message: `Recalculated tiers for ${allCreators.length} creators, ${updatedCount} updated`,
        updates
      });
    }
  } catch (error) {
    console.error('Error recalculating tiers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to recalculate tiers' },
      { status: 500 }
    );
  }
}
