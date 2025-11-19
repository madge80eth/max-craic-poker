import { NextRequest, NextResponse } from 'next/server'
import { getGameState, getActiveTournament, getPlayerCards } from '@/lib/tournament-redis'
import { GameState } from '@/types'

// Cache for 1 second to reduce Redis calls
let cachedState: GameState | null = null
let cacheTime = 0
let cachedTournamentId = ''

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tournamentId = searchParams.get('tournamentId')
    const walletAddress = searchParams.get('wallet') // Optional: to include private cards

    // If no tournamentId provided, get the active tournament
    const targetTournamentId = tournamentId || await getActiveTournament()

    if (!targetTournamentId) {
      return NextResponse.json(
        { error: 'No active tournament found' },
        { status: 404 }
      )
    }

    // Check cache (1 second freshness)
    const now = Date.now()
    if (
      cachedState &&
      cachedTournamentId === targetTournamentId &&
      now - cacheTime < 1000
    ) {
      // Return cached state (add private cards if wallet provided)
      if (walletAddress) {
        const cards = await getPlayerCards(targetTournamentId, walletAddress)
        return NextResponse.json({
          ...cachedState,
          privateCards: cards || []
        })
      }
      return NextResponse.json(cachedState)
    }

    // Fetch fresh state from Redis
    const state = await getGameState(targetTournamentId)

    if (!state) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    // Update cache
    cachedState = state
    cacheTime = now
    cachedTournamentId = targetTournamentId

    // Add private cards if wallet provided
    if (walletAddress) {
      const cards = await getPlayerCards(targetTournamentId, walletAddress)
      return NextResponse.json({
        ...state,
        privateCards: cards || []
      })
    }

    return NextResponse.json(state)

  } catch (error) {
    console.error('Error fetching game state:', error)
    return NextResponse.json(
      { error: 'Failed to fetch game state' },
      { status: 500 }
    )
  }
}

// Clear cache when state is updated (called from other endpoints)
export function invalidateCache() {
  cachedState = null
  cacheTime = 0
}
