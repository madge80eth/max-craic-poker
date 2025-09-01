// app/api/reset/route.ts
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

// Load tournaments.json from the public folder
async function loadTournaments() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/tournaments.json`);
  if (!res.ok) throw new Error("Failed to load tournaments.json");
  return res.json();
}

export async function POST() {
  try {
    // Clear old state
    await redis.del("entries");
    await redis.del("winner");

    // Load tournaments and pick one at random
    const tournaments = await loadTournaments();
    const randomTournament =
      tournaments[Math.floor(Math.random() * tournaments.length)];

    // Save chosen tournament (as JSON string)
    await redis.set("communityTournament", JSON.stringify(randomTournament));

    return NextResponse.json({
      success: true,
      communityTournament: randomTournament,
    });
  } catch (err) {
    console.error("Error in /api/reset:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
