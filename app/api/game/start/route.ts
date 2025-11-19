import { NextRequest, NextResponse } from 'next/server'
import {
  getGameState,
  getTournamentConfig,
  getActiveTournament,
  getRegistrationCount
} from '@/lib/tournament-redis'
import { startTournament } from '@/lib/game-init'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tournamentId: providedTournamentId } = body

    // Get tournament ID
    const tournamentId = providedTournamentId || await getActiveTournament()

    if (!tournamentId) {
      return NextResponse.json(
        { error: 'No active tournament found' },
        { status: 404 }
      )
    }

    // Get tournament config
    const config = await getTournamentConfig(tournamentId)
    if (!config) {
      return NextResponse.json(
        { error: 'Tournament configuration not found' },
        { status: 404 }
      )
    }

    // Check if already started
    const currentState = await getGameState(tournamentId)
    if (currentState && currentState.status !== 'registration') {
      return NextResponse.json(
        { error: 'Tournament already started or completed' },
        { status: 400 }
      )
    }

    // Check minimum players
    const playerCount = await getRegistrationCount(tournamentId)
    if (playerCount < 2) {
      return NextResponse.json(
        { error: 'Not enough players (minimum 2)' },
        { status: 400 }
      )
    }

    // Start tournament
    const initialState = await startTournament(tournamentId, config)

    console.log(`🚀 Tournament started: ${tournamentId}`)
    console.log(`👥 Players: ${initialState.players.length}`)

    return NextResponse.json({
      success: true,
      tournamentId,
      state: initialState,
      message: `Tournament started with ${initialState.players.length} players!`
    })

  } catch (error) {
    console.error('Error starting tournament:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start tournament' },
      { status: 500 }
    )
  }
}
