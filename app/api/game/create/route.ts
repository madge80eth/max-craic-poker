import { NextRequest, NextResponse } from 'next/server'
import {
  setTournamentConfig,
  setGameState,
  setActiveTournament,
  autoPopulateFromRaffle
} from '@/lib/tournament-redis'
import { TournamentConfig, GameState } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      startTime, // Unix timestamp or ISO string
      smallBlind = 10,
      bigBlind = 20,
      startingChips = 1000,
      maxPlayers = 6
    } = body

    // Parse start time
    const startTimestamp = typeof startTime === 'string'
      ? new Date(startTime).getTime()
      : startTime || Date.now() + 60 * 60 * 1000 // Default: 1 hour from now

    // Generate tournament ID from start time
    const tournamentId = new Date(startTimestamp).toISOString()

    // Calculate registration end time (30 mins before start)
    const registrationEndsAt = startTimestamp - (30 * 60 * 1000)

    // Create tournament config
    const config: TournamentConfig = {
      tournamentId,
      startTime: startTimestamp,
      registrationEndsAt,
      smallBlind,
      bigBlind,
      startingChips,
      blindIncreaseInterval: 5 * 60 * 1000, // 5 minutes
      actionTimeout: 30 * 1000, // 30 seconds
      maxPlayers
    }

    // Save config to Redis
    await setTournamentConfig(config)

    // Create initial game state
    const initialState: GameState = {
      tournamentId,
      status: 'registration',
      currentHandNumber: 0,
      dealerPosition: 0,
      smallBlindPosition: 0,
      bigBlindPosition: 0,
      currentBlindLevel: 1,
      smallBlind,
      bigBlind,
      pot: 0,
      communityCards: [],
      currentBettingRound: 'preflop',
      activePlayerPosition: 0,
      players: [],
      sidePots: [],
      lastUpdate: Date.now()
    }

    await setGameState(initialState)

    // Set as active tournament
    await setActiveTournament(tournamentId)

    // Auto-populate from raffle entrants
    const registeredCount = await autoPopulateFromRaffle(tournamentId)

    console.log(`✅ Tournament created: ${tournamentId}`)
    console.log(`📝 Auto-registered ${registeredCount} players from raffle`)

    return NextResponse.json({
      success: true,
      tournamentId,
      config,
      registeredPlayers: registeredCount,
      message: `Tournament created! ${registeredCount} raffle entrants auto-registered.`
    })

  } catch (error) {
    console.error('Error creating tournament:', error)
    return NextResponse.json(
      { error: 'Failed to create tournament' },
      { status: 500 }
    )
  }
}
