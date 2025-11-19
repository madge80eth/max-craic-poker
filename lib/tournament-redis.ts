import { Redis } from '@upstash/redis'
import { GameState, TournamentConfig, TournamentResult, Player } from '@/types'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// ============================================
// TOURNAMENT CONFIGURATION
// ============================================

export async function getTournamentConfig(tournamentId: string): Promise<TournamentConfig | null> {
  const data = await redis.get(`tournament:config:${tournamentId}`)
  return data as TournamentConfig | null
}

export async function setTournamentConfig(config: TournamentConfig): Promise<void> {
  await redis.set(`tournament:config:${config.tournamentId}`, JSON.stringify(config), {
    ex: 86400 // 24 hours
  })
}

// ============================================
// GAME STATE (PRIMARY)
// ============================================

export async function getGameState(tournamentId: string): Promise<GameState | null> {
  const data = await redis.get(`tournament:state:${tournamentId}`)
  return data as GameState | null
}

export async function setGameState(state: GameState): Promise<void> {
  await redis.set(`tournament:state:${state.tournamentId}`, JSON.stringify(state), {
    ex: 86400 // 24 hours
  })
}

// ============================================
// PLAYER REGISTRATIONS
// ============================================

export async function registerPlayer(tournamentId: string, walletAddress: string): Promise<void> {
  await redis.sadd(`tournament:registrations:${tournamentId}`, walletAddress)
  await redis.expire(`tournament:registrations:${tournamentId}`, 86400) // 24 hours
}

export async function getRegisteredPlayers(tournamentId: string): Promise<string[]> {
  const players = await redis.smembers(`tournament:registrations:${tournamentId}`)
  return players as string[]
}

export async function isPlayerRegistered(tournamentId: string, walletAddress: string): Promise<boolean> {
  const result = await redis.sismember(`tournament:registrations:${tournamentId}`, walletAddress)
  return result === 1
}

export async function getRegistrationCount(tournamentId: string): Promise<number> {
  const count = await redis.scard(`tournament:registrations:${tournamentId}`)
  return count
}

// ============================================
// PLAYER CARDS (PRIVATE)
// ============================================

export async function setPlayerCards(tournamentId: string, walletAddress: string, cards: string[]): Promise<void> {
  await redis.set(`tournament:cards:${tournamentId}:${walletAddress}`, JSON.stringify(cards), {
    ex: 3600 // 1 hour
  })
}

export async function getPlayerCards(tournamentId: string, walletAddress: string): Promise<string[] | null> {
  const data = await redis.get(`tournament:cards:${tournamentId}:${walletAddress}`)
  return data ? JSON.parse(data as string) : null
}

export async function deletePlayerCards(tournamentId: string, walletAddress: string): Promise<void> {
  await redis.del(`tournament:cards:${tournamentId}:${walletAddress}`)
}

// ============================================
// ACTIVE TOURNAMENT
// ============================================

export async function setActiveTournament(tournamentId: string): Promise<void> {
  await redis.set('tournament:active', tournamentId)
}

export async function getActiveTournament(): Promise<string | null> {
  const data = await redis.get('tournament:active')
  return data as string | null
}

// ============================================
// TOURNAMENT RESULTS
// ============================================

export async function setTournamentResult(result: TournamentResult): Promise<void> {
  await redis.set(`tournament:results:${result.tournamentId}`, JSON.stringify(result), {
    ex: 2592000 // 30 days
  })
}

export async function getTournamentResult(tournamentId: string): Promise<TournamentResult | null> {
  const data = await redis.get(`tournament:results:${tournamentId}`)
  return data as TournamentResult | null
}

// ============================================
// "DEAL ME IN" 2FA SYSTEM
// ============================================

export async function markPlayerDealedIn(tournamentId: string, handNumber: number, walletAddress: string): Promise<void> {
  const key = `tournament:dealin:${tournamentId}:${handNumber}`
  await redis.sadd(key, walletAddress)
  await redis.expire(key, 600) // 10 minutes
}

export async function hasPlayerDealedIn(tournamentId: string, handNumber: number, walletAddress: string): Promise<boolean> {
  const result = await redis.sismember(`tournament:dealin:${tournamentId}:${handNumber}`, walletAddress)
  return result === 1
}

export async function getDealedInPlayers(tournamentId: string, handNumber: number): Promise<string[]> {
  const players = await redis.smembers(`tournament:dealin:${tournamentId}:${handNumber}`)
  return players as string[]
}

// ============================================
// AUTO-POPULATE RAFFLE ENTRANTS
// ============================================

export async function autoPopulateFromRaffle(tournamentId: string): Promise<number> {
  // Get all current raffle entries
  const raffleEntries = await redis.hgetall('raffle_entries')

  if (!raffleEntries) {
    return 0
  }

  // Extract wallet addresses from raffle entries
  const walletAddresses = Object.keys(raffleEntries)

  // Add all to tournament registrations
  if (walletAddresses.length > 0) {
    await redis.sadd(`tournament:registrations:${tournamentId}`, ...walletAddresses)
    await redis.expire(`tournament:registrations:${tournamentId}`, 86400)
  }

  return walletAddresses.length
}
