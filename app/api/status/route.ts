// app/api/status/route.ts
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fid = searchParams.get("fid");

  if (!fid) {
    return NextResponse.json({ error: "Missing fid" }, { status: 400 });
  }

  try {
    const existing = await redis.hget("entries", String(fid));

    if (existing) {
      const parsed = JSON.parse(existing as string);
      return NextResponse.json({
        entered: true,
        fid,
        tournament: parsed.tournament,
      });
    }

    return NextResponse.json({ entered: false, fid });
  } catch (err) {
    console.error("Error in /api/status:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
