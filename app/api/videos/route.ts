// app/api/videos/route.ts
import { NextResponse } from 'next/server';
import { getAllVideos } from '@/lib/video-redis';
import { VideoCategory } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as VideoCategory | null;

    const videos = await getAllVideos(category || undefined);

    return NextResponse.json({ videos });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}
