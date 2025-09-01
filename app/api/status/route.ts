// app/api/status/route.ts
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fid = body?.untrustedData?.fid;

    if (!fid) {
      return NextResponse.json({ error: "FID required" }, { status: 400 });
    }

    // Check if already entered
    const existing = await redis.hget("entries", String(fid));

    // Get current community tournament (if any)
    const tournamentRaw = await redis.get("communityTournament");
    let tournament = null;
    if (tournamentRaw) {
      try {
        tournament = JSON.parse(tournamentRaw);
      } catch {
        tournament = null;
      }
    }

    if (existing) {
      return NextResponse.json({
        entered: true,
        fid,
        tournament,
      });
    }

    return NextResponse.json({
      entered: false,
      fid,
      tournament,
    });
  } catch (err) {
    console.error("Error in /api/status:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
