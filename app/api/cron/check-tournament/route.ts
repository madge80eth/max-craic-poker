import { NextRequest, NextResponse } from 'next/server'
import {
  getActiveTournament,
  getTournamentConfig,
  getGameState,
  setTournamentConfig,
  setActiveTournament,
  autoPopulateFromRaffle,
  setGameState
} from '@/lib/tournament-redis'
import { startTournament } from '@/lib/game-init'
import { TournamentConfig, GameState } from '@/types'

/**
 * Vercel Cron Job: Runs every minute
 *
 * Checks if:
 * 1. A tournament needs to be created (based on tournaments.json schedule)
 * 2. Registration needs to close (30 mins before start)
 * 3. Tournament needs to start
 */
export async function GET(req: NextRequest) {
  try {
    // Verify this is a cron request (Vercel sets this header)
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const now = Date.now()
    console.log(`🕐 Cron check running at ${new Date(now).toISOString()}`)

    // Load tournament schedule from tournaments.json
    const tournamentSchedule = await loadTournamentSchedule()

    if (!tournamentSchedule) {
      console.log('⚠️ No tournament schedule found')
      return NextResponse.json({ message: 'No schedule found' })
    }

    const { streamStartTime } = tournamentSchedule

    // Timeline:
    // 11:00am - Stream starts
    // 10:30am - Tournament starts (30 mins before stream)
    // 10:00am - Draw happens, registration opens (1 hour before stream)

    const streamStart = new Date(streamStartTime).getTime()
    const drawTime = streamStart - (60 * 60 * 1000) // 1 hour before stream (10:00am)
    const tournamentStartTime = streamStart - (30 * 60 * 1000) // 30 mins before stream (10:30am)
    const tournamentId = new Date(tournamentStartTime).toISOString()

    // Check if tournament already exists
    let config = await getTournamentConfig(tournamentId)

    // STEP 1: Create tournament at draw time (10:00am)
    // This opens registration immediately after draw
    if (!config && now >= drawTime && now < tournamentStartTime) {
      console.log(`🆕 Creating tournament at draw time: ${new Date(drawTime).toISOString()}`)
      console.log(`📝 Registration open until: ${new Date(tournamentStartTime).toISOString()}`)

      config = {
        tournamentId,
        startTime: tournamentStartTime, // 10:30am
        registrationEndsAt: tournamentStartTime, // Registration open for 30 mins
        smallBlind: 10,
        bigBlind: 20,
        startingChips: 1000,
        blindIncreaseInterval: 5 * 60 * 1000,
        actionTimeout: 30 * 1000,
        maxPlayers: 6
      }

      await setTournamentConfig(config)
      await setActiveTournament(tournamentId)

      // Auto-populate from raffle
      const registered = await autoPopulateFromRaffle(tournamentId)
      console.log(`✅ Tournament created! Auto-registered ${registered} players`)

      // Create initial state
      const initialState: GameState = {
        tournamentId,
        status: 'registration',
        currentHandNumber: 0,
        dealerPosition: 0,
        smallBlindPosition: 0,
        bigBlindPosition: 0,
        currentBlindLevel: 1,
        smallBlind: config.smallBlind,
        bigBlind: config.bigBlind,
        pot: 0,
        communityCards: [],
        currentBettingRound: 'preflop',
        activePlayerPosition: 0,
        players: [],
        sidePots: [],
        lastUpdate: now
      }

      await setGameState(initialState)

      return NextResponse.json({
        action: 'created',
        tournamentId,
        registeredPlayers: registered,
        startsAt: new Date(tournamentStartTime).toISOString()
      })
    }

    if (!config) {
      // No tournament to manage right now
      return NextResponse.json({ message: 'No active tournament window' })
    }

    // STEP 2: Start tournament at 10:30am (registration closes automatically)
    const state = await getGameState(tournamentId)
    if (state && state.status === 'registration' && now >= config.startTime) {
      console.log(`🚀 Auto-starting tournament at ${new Date(config.startTime).toISOString()}`)

      const startedState = await startTournament(tournamentId, config)

      return NextResponse.json({
        action: 'tournament_started',
        tournamentId,
        players: startedState.players.length,
        handNumber: startedState.currentHandNumber,
        dealMeInDeadline: new Date(startedState.dealMeInDeadline!).toISOString()
      })
    }

    // STEP 3: Check for initial "Deal Me In" deadline (3 mins after start)
    if (state && state.status === 'active' && state.dealMeInDeadline && now >= state.dealMeInDeadline) {
      console.log(`⏰ Initial Deal Me In deadline passed - checking for DQs`)

      const { getDealedInPlayers } = await import('@/lib/tournament-redis')
      const dealedIn = await getDealedInPlayers(tournamentId, 1) // Hand #1

      // DQ players who didn't click "Deal Me In" within 3 mins
      let dqCount = 0
      for (const player of state.players) {
        if (!dealedIn.includes(player.walletAddress)) {
          player.status = 'eliminated'
          player.missedHands = 3 // Max out missed hands
          dqCount++
        }
      }

      if (dqCount > 0) {
        // Remove deadline (only enforced once at start)
        delete state.dealMeInDeadline

        await setGameState({
          ...state,
          lastUpdate: now
        })

        console.log(`❌ Disqualified ${dqCount} players for missing initial Deal Me In`)

        return NextResponse.json({
          action: 'initial_dq_check',
          tournamentId,
          disqualified: dqCount,
          remaining: state.players.filter(p => p.status !== 'eliminated').length
        })
      }
    }

    // Nothing to do right now
    return NextResponse.json({
      message: 'All checks complete',
      currentStatus: state?.status || 'unknown',
      nextCheck: 'in 1 minute'
    })

  } catch (error) {
    console.error('❌ Cron error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron job failed' },
      { status: 500 }
    )
  }
}

/**
 * Load tournament schedule from public/tournaments.json
 */
async function loadTournamentSchedule() {
  try {
    const fs = await import('fs/promises')
    const path = await import('path')

    const filePath = path.join(process.cwd(), 'public', 'tournaments.json')
    const fileContents = await fs.readFile(filePath, 'utf8')
    const data = JSON.parse(fileContents)

    return data
  } catch (error) {
    console.error('Error loading tournament schedule:', error)
    return null
  }
}
