import { NextResponse } from "next/server";

// Hardcoded tournament list for demo purposes
const tournaments = [
  "Battle of Malta – €109",
  "Big $55 PKO – 100K GTD",
  "Daily Legends $22",
  "The Bounty Hunter – $44",
  "The Craic Classic – $5.50",
  "Midnight Madness – $33",
];

export async function POST() {
  // Randomly assign a tournament
  const assignedTournament =
    tournaments[Math.floor(Math.random() * tournaments.length)];

  // ✅ Stubbed success response without file writes
  return NextResponse.json({
    assignedTournament,
  });
}
