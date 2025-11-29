// app/api/videos/[id]/route.ts
import { NextResponse } from 'next/server';
import { getVideo } from '@/lib/video-redis';
import { isActiveMember, membershipRequiredResponse } from '@/lib/membership-middleware';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    const video = await getVideo(id);

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Check if video requires membership (members-only or early access)
    const now = Date.now();
    const isEarlyAccess = video.earlyAccessUntil && now < video.earlyAccessUntil;
    const isMembersOnly = video.membersOnly === true;

    if (isMembersOnly || isEarlyAccess) {
      // Check membership status
      const isMember = walletAddress ? await isActiveMember(walletAddress) : false;

      if (!isMember) {
        return NextResponse.json({
          ...membershipRequiredResponse(),
          video: {
            ...video,
            url: null, // Hide video URL from non-members
            isLocked: true,
            lockReason: isEarlyAccess ? 'early_access' : 'members_only',
            earlyAccessEndsAt: video.earlyAccessUntil
          }
        }, { status: 403 });
      }
    }

    return NextResponse.json({ video, isLocked: false });
  } catch (error) {
    console.error('Error fetching video:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video' },
      { status: 500 }
    );
  }
}
