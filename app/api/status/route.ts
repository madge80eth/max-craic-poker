// app/api/status/route.ts
import { NextResponse } from "next/server";
import { redis } from "../../../lib/redis";

adjust path if needed

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fid = body?.untrustedData?.fid;

    if (!fid) {
      return NextResponse.json(
        { error: "FID required" },
        { status: 400 }
      );
    }

    const entry = await redis.hget("entries", String(fid));

    if (entry) {
      return NextResponse.json({ entered: true, fid });
    } else {
      return NextResponse.json({ entered: false, fid });
    }
  } catch (err) {
    console.error("Error in /api/status:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
