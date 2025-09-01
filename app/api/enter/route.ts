// app/api/enter/route.ts
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fid = body?.untrustedData?.fid;

    // ✅ Require FID
    if (!fid) {
      return NextResponse.json(
        { error: "FID required to enter. Please create a Farcaster account." },
        { status: 400 }
      );
    }

    // Check if user already entered
    const existing = await redis.hget("entries", String(fid));
    if (existing) {
      return NextResponse.json({
        success: false,
        alreadyEntered: true,
        fid,
      });
    }

    // ✅ Store new entry (object form required by Upstash SDK)
    await redis.hset("entries", { [String(fid)]: JSON.stringify(body) });

    return NextResponse.json({ success: true, fid });
  } catch (err) {
    console.error("Error in /api/enter:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
