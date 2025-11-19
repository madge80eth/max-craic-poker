import { NextRequest, NextResponse } from 'next/server'
import {
  getGameState,
  getTournamentConfig,
  registerPlayer,
  isPlayerRegistered,
  getRegistrationCount,
  getActiveTournament
} from '@/lib/tournament-redis'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { walletAddress, tournamentId: providedTournamentId } = body

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      )
    }

    // Get tournament ID (provided or active)
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

    // Check if registration is still open
    const now = Date.now()
    if (now > config.registrationEndsAt) {
      return NextResponse.json(
        { error: 'Registration closed' },
        { status: 403 }
      )
    }

    // Check if tournament has started
    const state = await getGameState(tournamentId)
    if (state && state.status !== 'registration') {
      return NextResponse.json(
        { error: 'Tournament already started' },
        { status: 403 }
      )
    }

    // Check if already registered
    const alreadyRegistered = await isPlayerRegistered(tournamentId, walletAddress)
    if (alreadyRegistered) {
      return NextResponse.json(
        { error: 'Already registered' },
        { status: 400 }
      )
    }

    // Check if tournament is full
    const currentCount = await getRegistrationCount(tournamentId)
    if (currentCount >= config.maxPlayers) {
      return NextResponse.json(
        { error: 'Tournament full' },
        { status: 403 }
      )
    }

    // Register player
    await registerPlayer(tournamentId, walletAddress)

    const newCount = currentCount + 1

    return NextResponse.json({
      success: true,
      tournamentId,
      registered: newCount,
      maxPlayers: config.maxPlayers,
      registrationEndsAt: config.registrationEndsAt
    })

  } catch (error) {
    console.error('Error joining tournament:', error)
    return NextResponse.json(
      { error: 'Failed to join tournament' },
      { status: 500 }
    )
  }
}

// GET endpoint to check registration status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const walletAddress = searchParams.get('wallet')
    const tournamentId = searchParams.get('tournamentId') || await getActiveTournament()

    if (!tournamentId) {
      return NextResponse.json(
        { error: 'No active tournament found' },
        { status: 404 }
      )
    }

    const config = await getTournamentConfig(tournamentId)
    if (!config) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    const currentCount = await getRegistrationCount(tournamentId)
    const isRegistered = walletAddress
      ? await isPlayerRegistered(tournamentId, walletAddress)
      : false

    const now = Date.now()
    const registrationOpen = now < config.registrationEndsAt

    return NextResponse.json({
      tournamentId,
      registered: currentCount,
      maxPlayers: config.maxPlayers,
      isFull: currentCount >= config.maxPlayers,
      registrationOpen,
      registrationEndsAt: config.registrationEndsAt,
      startTime: config.startTime,
      isPlayerRegistered: isRegistered
    })

  } catch (error) {
    console.error('Error checking registration:', error)
    return NextResponse.json(
      { error: 'Failed to check registration' },
      { status: 500 }
    )
  }
}
