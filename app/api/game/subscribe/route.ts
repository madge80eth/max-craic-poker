import { NextRequest } from 'next/server'
import { Redis } from '@upstash/redis'

/**
 * Server-Sent Events (SSE) endpoint for real-time tournament updates
 *
 * Usage:
 * const eventSource = new EventSource('/api/game/subscribe?tournamentId=...')
 * eventSource.onmessage = (event) => {
 *   const state = JSON.parse(event.data)
 *   // Update UI with new state
 * }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tournamentId = searchParams.get('tournamentId')

  if (!tournamentId) {
    return new Response('Tournament ID required', { status: 400 })
  }

  // Create Redis subscriber instance
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  // Set up SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      // Channel name for this tournament
      const channel = `tournament:updates:${tournamentId}`

      console.log(`📡 New SSE subscriber for ${tournamentId}`)

      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', tournamentId })}\n\n`)
      )

      // Keep-alive ping every 30 seconds
      const keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keep-alive\n\n`))
        } catch (error) {
          clearInterval(keepAliveInterval)
        }
      }, 30000)

      // Subscribe to Redis Pub/Sub channel
      // Note: Upstash Redis REST API doesn't support traditional Pub/Sub
      // Instead, we'll poll for updates every 2 seconds (fallback for free tier)
      const pollInterval = setInterval(async () => {
        try {
          // Get latest state from Redis
          const state = await redis.get(`tournament:state:${tournamentId}`)

          if (state) {
            // Send state update to client
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'state_update', state })}\n\n`)
            )
          }
        } catch (error) {
          console.error('Error polling state:', error)
        }
      }, 2000)

      // Cleanup on disconnect
      req.signal.addEventListener('abort', () => {
        console.log(`📡 SSE subscriber disconnected from ${tournamentId}`)
        clearInterval(keepAliveInterval)
        clearInterval(pollInterval)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering for Nginx
    }
  })
}
