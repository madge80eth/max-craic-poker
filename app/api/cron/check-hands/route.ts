import { NextRequest, NextResponse } from 'next/server'
import { getActiveTournament, getGameState } from '@/lib/tournament-redis'
import { getLatestEvent } from '@/lib/tournament-pubsub'
import { checkDealMeInForHand } from '@/lib/hand-management'

/**
 * Vercel Cron Job: Checks for "Deal Me In" deadline enforcement
 * Runs every minute during active tournaments
 *
 * Checks if:
 * 1. Hand announcement was made 30+ seconds ago
 * 2. Players who didn't click "Deal Me In" need to be marked
 * 3. Players with 3 missed hands need to be DQ'd
 */
export async function GET(req: NextRequest) {
  try {
    // Verify this is a cron request
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const now = Date.now()
    console.log(`🕐 Hand check cron running at ${new Date(now).toISOString()}`)

    // Get active tournament
    const tournamentId = await getActiveTournament()

    if (!tournamentId) {
      return NextResponse.json({ message: 'No active tournament' })
    }

    const state = await getGameState(tournamentId)

    if (!state) {
      return NextResponse.json({ message: 'Tournament not found' })
    }

    if (state.status !== 'active') {
      return NextResponse.json({ message: 'Tournament not active' })
    }

    // Check for hand announcement event
    const latestEvent = await getLatestEvent(tournamentId)

    if (!latestEvent || latestEvent.type !== 'hand_starting') {
      return NextResponse.json({ message: 'No hand announcement pending' })
    }

    // Check if 30 seconds have passed since announcement
    const deadline = latestEvent.data.dealMeInDeadline
    if (now < deadline) {
      const remaining = Math.round((deadline - now) / 1000)
      return NextResponse.json({
        message: 'Waiting for Deal Me In deadline',
        secondsRemaining: remaining
      })
    }

    // Deadline passed - check who didn't click "Deal Me In"
    const handNumber = latestEvent.data.handNumber

    console.log(`⏰ Deal Me In deadline passed for hand ${handNumber}`)

    await checkDealMeInForHand(tournamentId, handNumber)

    return NextResponse.json({
      action: 'deal_me_in_checked',
      tournamentId,
      handNumber,
      message: 'Checked for missed hands'
    })

  } catch (error) {
    console.error('❌ Hand check cron error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron job failed' },
      { status: 500 }
    )
  }
}
