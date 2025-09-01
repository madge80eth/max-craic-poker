// app/api/enter/route.ts
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(req: Request) {
  try {
    const { fid } = await req.json();

    if (!fid) {
      return NextResponse.json({ error: "Missing fid" }, { status: 400 });
    }

    // Check if this fid already exists
    const existing = await redis.get(fid);

    if (existing) {
      let tournament;
      try {
        tournament =
          typeof existing === "string" ? JSON.parse(existing) : existing;
      } catch {
        tournament = existing;
      }

      return NextResponse.json({
        alreadyEntered: true,
        fid,
        tournament,
      });
    }

    // Get the active community tournament
    const communityTournament = await redis.get("communityTournament");
    if (!communityTournament) {
      return NextResponse.json(
        { error: "No active tournament" },
        { status: 400 }
      );
    }

    // Store entry
    await redis.set(fid, communityTournament);

    return NextResponse.json({
      success: true,
      fid,
      tournament:
        typeof communityTournament === "string"
          ? JSON.parse(communityTournament)
          : communityTournament,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
