// app/api/videos/[id]/tip/route.ts
import { NextResponse } from 'next/server';
import { addTip, getVideo } from '@/lib/video-redis';
import { VideoTip } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { amount, tipper, txHash } = body;

    // Validation
    if (!amount || !tipper) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, tipper' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Verify video exists
    const video = await getVideo(id);

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Create tip object
    const tip: VideoTip = {
      videoId: id,
      tipper,
      amount,
      timestamp: Date.now(),
      txHash
    };

    // Add tip
    await addTip(tip);

    return NextResponse.json({
      success: true,
      totalTips: video.totalTips + amount
    });
  } catch (error) {
    console.error('Error recording tip:', error);
    return NextResponse.json(
      { error: 'Failed to record tip' },
      { status: 500 }
    );
  }
}
