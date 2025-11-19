import { NextRequest, NextResponse } from 'next/server'
import {
  getGameState,
  setGameState,
  getActiveTournament,
  getPlayerCards
} from '@/lib/tournament-redis'
import { validateAction, calculateSidePots, getNextActivePosition } from '@/lib/poker-engine'
import { notifyEvent } from '@/lib/tournament-pubsub'
import { PlayerAction } from '@/types'

/**
 * POST: Player takes action (fold/check/call/bet/raise/all-in)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      walletAddress,
      action,
      amount,
      tournamentId: providedTournamentId
    } = body

    if (!walletAddress || !action) {
      return NextResponse.json(
        { error: 'Wallet address and action required' },
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

    // Get current game state
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

    // Find player
    const playerIndex = state.players.findIndex(p => p.walletAddress === walletAddress)

    if (playerIndex === -1) {
      return NextResponse.json(
        { error: 'Player not in tournament' },
        { status: 404 }
      )
    }

    const player = state.players[playerIndex]

    // Check if it's player's turn
    if (player.seatPosition !== state.activePlayerPosition) {
      return NextResponse.json(
        { error: 'Not your turn' },
        { status: 400 }
      )
    }

    // Check if player is eliminated or sitting out
    if (player.status !== 'active') {
      return NextResponse.json(
        { error: 'Player not active' },
        { status: 400 }
      )
    }

    // Calculate current bet to match
    const currentBet = Math.max(...state.players.map(p => p.currentBet))

    // Validate action
    const validation = validateAction(player, action as PlayerAction, amount, currentBet)

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Process action
    const now = Date.now()
    player.lastAction = action as PlayerAction
    player.lastActionTime = now

    switch (action) {
      case 'fold':
        player.status = 'sitting-out' // Fold for this hand
        player.cards = [] // Remove cards
        console.log(`♠️ ${walletAddress} folded`)
        break

      case 'check':
        // No chips moved
        console.log(`♠️ ${walletAddress} checked`)
        break

      case 'call':
        const callAmount = currentBet - player.currentBet
        player.chipStack -= callAmount
        player.currentBet = currentBet
        player.totalBetThisRound += callAmount
        state.pot += callAmount
        console.log(`♠️ ${walletAddress} called ${callAmount}`)
        break

      case 'bet':
        if (!amount || amount <= 0) {
          return NextResponse.json({ error: 'Invalid bet amount' }, { status: 400 })
        }
        player.chipStack -= amount
        player.currentBet = amount
        player.totalBetThisRound += amount
        state.pot += amount
        console.log(`♠️ ${walletAddress} bet ${amount}`)
        break

      case 'raise':
        if (!amount) {
          return NextResponse.json({ error: 'Raise amount required' }, { status: 400 })
        }
        const raiseAmount = amount - player.currentBet
        player.chipStack -= raiseAmount
        player.currentBet = amount
        player.totalBetThisRound += raiseAmount
        state.pot += raiseAmount
        console.log(`♠️ ${walletAddress} raised to ${amount}`)
        break

      case 'all-in':
        const allInAmount = player.chipStack
        player.currentBet += allInAmount
        player.totalBetThisRound += allInAmount
        state.pot += allInAmount
        player.chipStack = 0
        console.log(`♠️ ${walletAddress} went all-in for ${allInAmount}`)
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Move to next active player
    state.activePlayerPosition = getNextActivePosition(state.players, player.seatPosition)

    // Check if betting round is complete (everyone has acted and matched)
    const activePlayers = state.players.filter(p => p.status === 'active' && p.chipStack > 0)
    const allMatched = activePlayers.every(p =>
      p.currentBet === currentBet || p.chipStack === 0 || p.lastAction === 'fold'
    )

    if (allMatched && activePlayers.every(p => p.lastAction)) {
      // Betting round complete - move to next round
      console.log(`✅ Betting round complete: ${state.currentBettingRound}`)

      // Reset current bets for next round
      state.players.forEach(p => {
        p.currentBet = 0
        p.lastAction = undefined
      })

      // Calculate side pots if needed
      state.sidePots = calculateSidePots(state.players)

      // Advance to next betting round
      // (Community cards dealing will be handled by separate endpoint)
    }

    // Update state
    state.lastUpdate = now
    await setGameState(state)

    // Notify event
    await notifyEvent(tournamentId, 'player_action', {
      walletAddress,
      action,
      amount,
      pot: state.pot,
      nextPlayer: state.activePlayerPosition
    })

    console.log(`✅ Action processed: ${action} by ${walletAddress}`)

    return NextResponse.json({
      success: true,
      action,
      pot: state.pot,
      playerChips: player.chipStack,
      nextPlayer: state.activePlayerPosition
    })

  } catch (error) {
    console.error('Error processing action:', error)
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    )
  }
}

/**
 * GET: Check available actions for player
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

    if (!player) {
      return NextResponse.json(
        { error: 'Player not in tournament' },
        { status: 404 }
      )
    }

    const isPlayerTurn = player.seatPosition === state.activePlayerPosition
    const currentBet = Math.max(...state.players.map(p => p.currentBet))
    const canCheck = player.currentBet === currentBet
    const callAmount = currentBet - player.currentBet

    return NextResponse.json({
      isYourTurn: isPlayerTurn,
      currentBet,
      playerBet: player.currentBet,
      playerChips: player.chipStack,
      pot: state.pot,
      availableActions: {
        fold: true,
        check: canCheck,
        call: !canCheck && callAmount <= player.chipStack,
        callAmount,
        bet: currentBet === 0 && player.chipStack > 0,
        raise: currentBet > 0 && player.chipStack > callAmount,
        minRaise: currentBet * 2,
        allIn: player.chipStack > 0
      }
    })

  } catch (error) {
    console.error('Error checking available actions:', error)
    return NextResponse.json(
      { error: 'Failed to check actions' },
      { status: 500 }
    )
  }
}
