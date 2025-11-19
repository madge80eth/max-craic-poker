import { NextRequest, NextResponse } from 'next/server'
import {
  getGameState,
  getActiveTournament,
  markPlayerDealedIn,
  hasPlayerDealedIn
} from '@/lib/tournament-redis'

/**
 * POST: Player confirms presence for current hand
 * GET: Check if player has confirmed for current hand
 */
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

    // Get tournament ID
    const tournamentId = providedTournamentId || await getActiveTournament()

    if (!tournamentId) {
      return NextResponse.json(
        { error: 'No active tournament found' },
        { status: 404 }
      )
    }

    // Get game state
    const state = await getGameState(tournamentId)

    if (!state) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    if (state.status !== 'active') {
      return NextResponse.json(
        { error: 'Tournament not active' },
        { status: 400 }
      )
    }

    // Check if player is in tournament
    const player = state.players.find(p => p.walletAddress === walletAddress)

    if (!player) {
      return NextResponse.json(
        { error: 'Player not in tournament' },
        { status: 404 }
      )
    }

    if (player.status === 'eliminated') {
      return NextResponse.json(
        { error: 'Player already eliminated' },
        { status: 400 }
      )
    }

    // Check if already confirmed for this hand
    const alreadyDealed = await hasPlayerDealedIn(tournamentId, state.currentHandNumber, walletAddress)

    if (alreadyDealed) {
      return NextResponse.json({
        success: true,
        message: 'Already confirmed for this hand',
        handNumber: state.currentHandNumber
      })
    }

    // Mark player as dealt in
    await markPlayerDealedIn(tournamentId, state.currentHandNumber, walletAddress)

    console.log(`✅ ${walletAddress} confirmed for hand #${state.currentHandNumber}`)

    return NextResponse.json({
      success: true,
      message: 'Confirmed!',
      handNumber: state.currentHandNumber,
      missedHands: player.missedHands
    })

  } catch (error) {
    console.error('Error confirming Deal Me In:', error)
    return NextResponse.json(
      { error: 'Failed to confirm' },
      { status: 500 }
    )
  }
}

/**
 * GET: Check if player has confirmed for current hand
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const walletAddress = searchParams.get('wallet')
    const tournamentId = searchParams.get('tournamentId') || await getActiveTournament()

    if (!walletAddress || !tournamentId) {
      return NextResponse.json(
        { error: 'Wallet and tournament ID required' },
        { status: 400 }
      )
    }

    const state = await getGameState(tournamentId)

    if (!state) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    const player = state.players.find(p => p.walletAddress === walletAddress)
    const hasConfirmed = await hasPlayerDealedIn(tournamentId, state.currentHandNumber, walletAddress)

    const now = Date.now()
    const deadline = state.dealMeInDeadline // Only set for first 3 mins

    return NextResponse.json({
      handNumber: state.currentHandNumber,
      hasConfirmed,
      missedHands: player?.missedHands || 0,
      playerStatus: player?.status || 'unknown',
      deadline: deadline ? new Date(deadline).toISOString() : null,
      deadlineExpired: deadline ? now >= deadline : false
    })

  } catch (error) {
    console.error('Error checking Deal Me In status:', error)
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    )
  }
}
