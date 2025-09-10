import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"

export async function POST() {
  try {
    // Get all entries
    const entries = await redis.hgetall("entries")
    if (!entries || Object.keys(entries).length === 0) {
      return NextResponse.json({ error: "No entries found" }, { status: 400 })
    }

    // Pick random winner wallet address
    const walletAddresses = Object.keys(entries)
    const winnerWallet = walletAddresses[Math.floor(Math.random() * walletAddresses.length)]
    const winnerEntryRaw = entries[winnerWallet]

    // Parse winner entry
    let winnerEntry: any
    try {
      winnerEntry = JSON.parse(winnerEntryRaw as string)
    } catch {
      winnerEntry = { walletAddress: winnerWallet, raw: winnerEntryRaw }
    }

    // Create winner data object
    const winnerData = {
      walletAddress: winnerWallet,
      entry: winnerEntry,
      drawnAt: new Date().toISOString(),
      totalEntries: walletAddresses.length
    }

    // Save as proper JSON string to Redis
    const winnerJson = JSON.stringify(winnerData)
    await redis.set("winner", winnerJson)

    console.log("Winner saved to Redis:", winnerJson)

    return NextResponse.json({
      success: true,
      winner: winnerData,
      totalEntries: walletAddresses.length
    })

  } catch (err) {
    console.error("Error in /api/draw:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}