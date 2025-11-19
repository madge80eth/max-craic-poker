import { GameState } from '@/types'
import { redis } from '@/lib/tournament-redis'

/**
 * Publish state update to Redis channel
 * Note: Upstash REST API doesn't support true Pub/Sub
 * Instead, we just update the state in Redis and SSE clients poll for changes
 */
export async function publishStateUpdate(state: GameState): Promise<void> {
  // The state is already saved in Redis via setGameState
  // SSE clients poll tournament:state:{id} every 2 seconds
  // This function is here for future Redis Pub/Sub implementation if needed

  console.log(`📢 State published for ${state.tournamentId} (hand ${state.currentHandNumber})`)
}

/**
 * Broadcast message to all tournament subscribers
 * For future Redis Pub/Sub implementation
 */
export async function broadcastMessage(tournamentId: string, message: any): Promise<void> {
  // Future: Use Redis Pub/Sub when Upstash adds support
  // For now, this is a no-op since clients poll the state directly
  console.log(`📢 Broadcast to ${tournamentId}:`, message.type)
}

/**
 * Notify specific event (e.g., hand starting, player eliminated)
 */
export async function notifyEvent(
  tournamentId: string,
  eventType: string,
  data: any
): Promise<void> {
  // Store event in Redis with short TTL for clients to pick up
  const eventKey = `tournament:events:${tournamentId}`

  const event = {
    type: eventType,
    timestamp: Date.now(),
    data
  }

  // Store latest event (overwrite previous)
  await redis.set(eventKey, JSON.stringify(event), { ex: 60 }) // 60 second TTL

  console.log(`🔔 Event: ${eventType} for ${tournamentId}`)
}

/**
 * Get latest event for tournament
 */
export async function getLatestEvent(tournamentId: string): Promise<any | null> {
  const eventKey = `tournament:events:${tournamentId}`
  const event = await redis.get(eventKey)

  if (!event) return null

  return typeof event === 'string' ? JSON.parse(event) : event
}
