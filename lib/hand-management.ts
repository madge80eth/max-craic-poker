import { GameState, Player } from '@/types'
import { getGameState, setGameState, getDealedInPlayers } from '@/lib/tournament-redis'
import { notifyEvent } from '@/lib/tournament-pubsub'

/**
 * Check for players who missed the "Deal Me In" for current hand
 * Called 30 seconds after hand announcement
 */
export async function checkDealMeInForHand(tournamentId: string, handNumber: number): Promise<void> {
  const state = await getGameState(tournamentId)

  if (!state || state.currentHandNumber !== handNumber) {
    return // Hand already advanced
  }

  const dealedIn = await getDealedInPlayers(tournamentId, handNumber)

  let changessMade = false

  for (const player of state.players) {
    // Skip already eliminated players
    if (player.status === 'eliminated') continue

    // Check if player clicked "Deal Me In"
    if (!dealedIn.includes(player.walletAddress)) {
      player.missedHands++

      console.log(`⚠️ ${player.walletAddress} missed hand ${handNumber} (total missed: ${player.missedHands})`)

      // DQ after 3 missed hands
      if (player.missedHands >= 3) {
        player.status = 'eliminated'
        console.log(`❌ ${player.walletAddress} DISQUALIFIED (3 missed hands)`)

        await notifyEvent(tournamentId, 'player_eliminated', {
          walletAddress: player.walletAddress,
          reason: 'missed_hands',
          missedCount: player.missedHands
        })
      } else {
        // Mark as sitting out for this hand
        player.status = 'sitting-out'
      }

      changessMade = true
    } else {
      // Player clicked "Deal Me In", reset to active if they were sitting out
      if (player.status === 'sitting-out') {
        player.status = 'active'
        changessMade = true
      }
    }
  }

  if (changessMade) {
    await setGameState({
      ...state,
      lastUpdate: Date.now()
    })
  }
}

/**
 * Announce next hand starting
 * Gives players 30 seconds to click "Deal Me In"
 */
export async function announceNextHand(tournamentId: string, handNumber: number): Promise<void> {
  await notifyEvent(tournamentId, 'hand_starting', {
    handNumber,
    dealMeInDeadline: Date.now() + 30000 // 30 seconds from now
  })

  console.log(`📢 Hand ${handNumber} announced - 30 seconds to "Deal Me In"`)
}

/**
 * Check if enough active players to continue
 */
export async function checkTournamentContinuation(state: GameState): Promise<boolean> {
  const activePlayers = state.players.filter(p => p.status !== 'eliminated' && p.chipStack > 0)

  if (activePlayers.length < 2) {
    console.log(`🏁 Tournament ending - less than 2 active players`)
    return false
  }

  // Check if down to 3 players (tournament complete)
  if (activePlayers.length === 3) {
    console.log(`🏆 Tournament complete - 3 finalists remaining`)
    return false
  }

  return true
}
