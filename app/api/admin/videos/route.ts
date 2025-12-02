// app/api/admin/videos/route.ts
import { NextResponse } from 'next/server';
import { createVideo } from '@/lib/video-redis';
import { VideoCategory } from '@/types';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      cloudflareVideoId,
      title,
      description,
      category,
      duration,
      thumbnailUrl,
      membersOnly
    } = body;

    // Validation
    if (!cloudflareVideoId || !title || !description || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: cloudflareVideoId, title, description, category' },
        { status: 400 }
      );
    }

    if (!['highlight', 'breakdown', 'strategy'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be: highlight, breakdown, or strategy' },
        { status: 400 }
      );
    }

    // Generate video ID
    const id = nanoid(10);

    // Create video
    const video = await createVideo({
      id,
      title,
      description,
      cloudflareVideoId,
      thumbnailUrl: thumbnailUrl || `https://customer-{code}.cloudflarestream.com/${cloudflareVideoId}/thumbnails/thumbnail.jpg`,
      duration: duration || 0,
      category: category as VideoCategory,
      membersOnly: membersOnly || false
    });

    return NextResponse.json({
      success: true,
      video
    });
  } catch (error) {
    console.error('Error creating video:', error);
    return NextResponse.json(
      { error: 'Failed to create video' },
      { status: 500 }
    );
  }
}
