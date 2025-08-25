import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const fid = data?.untrustedData?.fid;

    if (!fid) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing FID' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const entry = {
      fid,
      timestamp: new Date().toISOString(),
    };

    // Save entry to Redis
    await fetch(
      `${process.env.UPSTASH_REDIS_REST_URL}/lpush/entries/${encodeURIComponent(JSON.stringify(entry))}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        },
      }
    );

    // ✅ Minimal valid Farcaster Frame response
    const frameResponse = {
      imageUrl: "https://max-craic-poker.vercel.app/api/frame-image?entered=true",
      buttons: [
        { label: "✅ Entered!" }
      ]
    };

    return new NextResponse(
      JSON.stringify(frameResponse),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error in /api/enter:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
