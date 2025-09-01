// app/api/status/route.ts
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fid = body?.untrustedData?.fid;

    if (!fid) {
      return NextResponse.json(
        { error: "FID required to check status." },
        { status: 400 }
      );
    }

    const existing = await redis.hget("entries", String(fid));

    if (existing) {
      let parsed: any;
      try {
        parsed = typeof existing === "string" ? JSON.parse(existing) : existing;
      } catch {
        parsed = existing;
      }

      return NextResponse.json({
        entered: true,
        fid,
        entry: parsed,
      });
    }

    return NextResponse.json({ entered: false, fid });
  } catch (err) {
    console.error("Error in /api/status:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
