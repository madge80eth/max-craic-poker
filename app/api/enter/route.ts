import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import tournaments from "@/public/tournaments.json"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Extract wallet address from request
    const walletAddress = body.untrustedData?.address || body.address
    
    if (!walletAddress) {
      return NextResponse.json({ error: "No wallet address provided" }, { status: 400 })
    }

    // Check if already entered
    const existingEntry = await redis.hget("entries", walletAddress)
    if (existingEntry) {
      return NextResponse.json({ 
        error: "Already entered",
        entry: JSON.parse(existingEntry as string)
      }, { status: 400 })
    }

    // Assign random tournament - store the full tournament object
    const randomTournament = tournaments[Math.floor(Math.random() * tournaments.length)]
    
    // Create entry with full tournament data
    const entry = {
      walletAddress,
      platform: body.platform || "farcaster",
      tournament: randomTournament.name,  // Store tournament name
      tournamentBuyIn: randomTournament.buyIn,
      timestamp: new Date().toISOString(),
      hasRecasted: false
    }

    // Store in Redis
    await redis.hset("entries", walletAddress, JSON.stringify(entry))

    return NextResponse.json({
      success: true,
      message: "Entry successful!",
      entry
    })

  } catch (error) {
    console.error("Error in /api/enter:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}