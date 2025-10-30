import { Redis } from '@upstash/redis';
import { readFileSync } from 'fs';
import { join } from 'path';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Checks if session has changed in tournaments.json and auto-resets draw if needed.
 * Call this at the start of any API that interacts with the draw system.
 */
export async function checkAndResetSession(): Promise<void> {
  try {
    // Load current session from tournaments.json
    const tournamentsPath = join(process.cwd(), 'public', 'tournaments.json');
    const tournamentsFile = readFileSync(tournamentsPath, 'utf-8');
    const tournamentsData = JSON.parse(tournamentsFile);
    const currentSessionId = tournamentsData.sessionId;

    if (!currentSessionId) {
      console.warn('No sessionId found in tournaments.json');
      return;
    }

    // Check stored session in Redis
    const storedSessionId = await redis.get('current_session_id');

    // If session changed, auto-reset draw
    if (storedSessionId && storedSessionId !== currentSessionId) {
      console.log(`🔄 Session changed from ${storedSessionId} to ${currentSessionId} - auto-resetting draw`);

      // Clear current draw data (but preserve entry_history for leaderboard)
      await redis.del('raffle_entries');
      await redis.del('raffle_winners');

      // Update stored session ID
      await redis.set('current_session_id', currentSessionId);

      console.log('✅ Draw auto-reset complete');
    } else if (!storedSessionId) {
      // First time, just store the session ID
      await redis.set('current_session_id', currentSessionId);
      console.log(`📝 Initialized session tracking: ${currentSessionId}`);
    }
  } catch (error) {
    console.error('Session check error:', error);
    // Don't throw - allow API to continue even if session check fails
  }
}
