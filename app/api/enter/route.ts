import { NextResponse } from "next/server";

// Hardcoded tournament list
const tournaments = [
  "Battle of Malta – €109",
  "Big $55 PKO – 100K GTD",
  "Daily Legends $22",
  "The Bounty Hunter – $44",
  "The Craic Classic – $5.50",
  "Midnight Madness – $33",
];

export async function POST() {
  const assignedTournament =
    tournaments[Math.floor(Math.random() * tournaments.length)];

  return NextResponse.json({
    status: "ok", // ✅ Add this line
    assigned: assignedTournament, // ✅ Rename key to match frontend expectation
  });
}
