import { Redis } from '@upstash/redis';
import { readFileSync } from 'fs';
import { join } from 'path';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface TournamentsData {
  sessionId: string;
  streamStartTime: string;
  tournaments: Array<{ name: string; buyIn: string }>;
}

/**
 * Get tournaments data from Redis (primary) or fallback to file
 */
export async function getTournamentsData(): Promise<TournamentsData | null> {
  try {
    // Try Redis first (works in production)
    const redisData = await redis.get('tournaments_data');
    if (redisData) {
      return typeof redisData === 'string' ? JSON.parse(redisData) : redisData as TournamentsData;
    }

    // Fallback to file (local development)
    try {
      const tournamentsPath = join(process.cwd(), 'public', 'tournaments.json');
      const tournamentsFile = readFileSync(tournamentsPath, 'utf-8');
      const data = JSON.parse(tournamentsFile);

      // Sync to Redis for future reads
      await redis.set('tournaments_data', JSON.stringify(data));
      return data;
    } catch (fileError) {
      console.warn('Could not read tournaments.json:', fileError);
      return null;
    }
  } catch (error) {
    console.error('Error loading tournaments data:', error);
    return null;
  }
}

/**
 * Save tournaments data to Redis (and optionally to file in dev)
 */
export async function saveTournamentsData(data: TournamentsData): Promise<void> {
  // Save to Redis (works everywhere)
  await redis.set('tournaments_data', JSON.stringify(data));
  console.log('✅ Tournaments data saved to Redis');

  // Try to save to file as well (for local dev convenience)
  try {
    const { writeFile } = await import('fs/promises');
    const tournamentsPath = join(process.cwd(), 'public', 'tournaments.json');
    await writeFile(tournamentsPath, JSON.stringify(data, null, 2));
    console.log('✅ Tournaments data saved to file (local dev)');
  } catch (fileError) {
    // Ignore file write errors in production (Vercel is read-only)
    console.log('ℹ️ Could not write to file (expected in production)');
  }
}

/**
 * Checks if session has changed in tournaments data and auto-resets draw if needed.
 * Call this at the start of any API that interacts with the draw system.
 */
export async function checkAndResetSession(): Promise<void> {
  try {
    // Load current session from tournaments data
    const tournamentsData = await getTournamentsData();
    if (!tournamentsData) {
      console.warn('No tournaments data found');
      return;
    }

    const currentSessionId = tournamentsData.sessionId;
    if (!currentSessionId) {
      console.warn('No sessionId found in tournaments data');
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
