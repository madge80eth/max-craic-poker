// app/api/draw/route.ts
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST() {
  try {
    const entries = await redis.hgetall("entries");

    if (!entries || Object.keys(entries).length === 0) {
      return NextResponse.json(
        { error: "No entries available for draw." },
        { status: 400 }
      );
    }

    const fids = Object.keys(entries);
    const winnerFid = fids[Math.floor(Math.random() * fids.length)];
    const winnerEntryRaw = entries[winnerFid];

    let winnerEntry;
    try {
      winnerEntry = JSON.parse(winnerEntryRaw);
    } catch {
      winnerEntry = { fid: winnerFid, raw: winnerEntryRaw };
    }

    await redis.set("winner", JSON.stringify(winnerEntry));

    return NextResponse.json({
      success: true,
      winner: winnerEntry,
    });
  } catch (err) {
    console.error("Error in /api/draw:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
