import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const fid = data?.untrustedData?.fid;

    if (!fid) {
      return new NextResponse(
        JSON.stringify({ error: "Missing FID" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        }
      );
    }

    const entry = { fid, timestamp: new Date().toISOString() };

    // Save to Redis (fire and forget, don’t block frame response)
    fetch(
      `${process.env.UPSTASH_REDIS_REST_URL}/lpush/entries`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify([JSON.stringify(entry)])
      }
    ).catch(err => console.error("Redis error:", err));

    // ✅ Full Farcaster Frame spec response
    return new NextResponse(
      JSON.stringify({
        type: "frame",
        version: "vNext",
        image: "https://max-craic-poker.vercel.app/api/frame-image?entered=true",
        buttons: [
          { label: "✅ Entered!", action: "post" }
        ]
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    console.error("Error in /api/enter:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      }
    );
  }
}
