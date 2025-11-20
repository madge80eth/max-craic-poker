// app/api/videos/[id]/view/route.ts
import { NextResponse } from 'next/server';
import { incrementViewCount, getVideo } from '@/lib/video-redis';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verify video exists
    const video = await getVideo(params.id);

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Increment view count
    await incrementViewCount(params.id);

    return NextResponse.json({ success: true, viewCount: video.viewCount + 1 });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    return NextResponse.json(
      { error: 'Failed to increment view count' },
      { status: 500 }
    );
  }
}
