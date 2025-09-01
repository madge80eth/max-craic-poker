// app/api/enter/route.ts
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fid = body?.untrustedData?.fid;

    if (!fid) {
      return NextResponse.json({ error: "Missing fid" }, { status: 400 });
    }

    // Save entry
    await redis.sadd("entries", fid);

    // Response for Farcaster Frame (post action)
    return new NextResponse(
      `
      <html>
        <head>
          <meta name="fc:frame" content="vNext" />
          <meta name="fc:frame:image" content="https://max-craic-poker.vercel.app/api/frame-image?entered=true" />
          <meta name="fc:frame:button:1" content="Recast to win +5%" />
          <meta name="fc:frame:button:1:action" content="link" />
          <meta name="fc:frame:button:1:target" content="https://warpcast.com/~/compose?text=Join%20the%20Max%20Craic%20Poker%20draw!&embeds[]=https://max-craic-poker.vercel.app/share" />
        </head>
      </html>
      `,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html",
        },
      }
    );
  } catch (err) {
    console.error("Enter API error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  // Mini app users get redirected after entering
  return NextResponse.redirect("https://max-craic-poker.vercel.app/share?entered=true");
}
