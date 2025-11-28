// app/api/videos/[id]/tip/route.ts
import { NextResponse } from 'next/server';
import { addTip, getVideo } from '@/lib/video-redis';
import { recordTransaction } from '@/lib/revenue-redis';
import { VideoTip } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { amount, tokenAddress, tokenSymbol, usdValue, tipper, txHash } = body;

    // Validation
    if (!amount || !tipper || !tokenAddress || !tokenSymbol) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, tipper, tokenAddress, tokenSymbol' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    if (!txHash) {
      return NextResponse.json(
        { error: 'Transaction hash is required' },
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
      tokenAddress,
      tokenSymbol,
      usdValue,
      timestamp: Date.now(),
      txHash
    };

    // Add tip to video
    await addTip(tip);

    // Record transaction for revenue tracking
    await recordTransaction({
      type: 'tip',
      amount: usdValue || amount, // Use USD value for revenue tracking
      tokenAddress,
      tokenSymbol,
      walletAddress: tipper,
      timestamp: tip.timestamp,
      txHash,
      metadata: {
        videoId: id,
        videoTitle: video.title
      }
    });

    return NextResponse.json({
      success: true,
      totalTips: video.totalTips + (usdValue || amount)
    });
  } catch (error) {
    console.error('Error recording tip:', error);
    return NextResponse.json(
      { error: 'Failed to record tip' },
      { status: 500 }
    );
  }
}
