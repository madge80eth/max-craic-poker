import { Redis } from '@upstash/redis';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DEFAULT_CREATOR_ID, getCreatorKey } from './creator-context';

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
export async function getTournamentsData(creatorId: string = DEFAULT_CREATOR_ID): Promise<TournamentsData | null> {
  try {
    // Try Redis first (works in production)
    const key = getCreatorKey(creatorId, 'tournaments_data');
    const redisData = await redis.get(key);
    if (redisData) {
      return typeof redisData === 'string' ? JSON.parse(redisData) : redisData as TournamentsData;
    }

    // Fallback to file (local development) - only for default creator
    if (creatorId === DEFAULT_CREATOR_ID) {
      try {
        const tournamentsPath = join(process.cwd(), 'public', 'tournaments.json');
        const tournamentsFile = readFileSync(tournamentsPath, 'utf-8');
        const data = JSON.parse(tournamentsFile);

        // Sync to Redis for future reads
        await redis.set(key, JSON.stringify(data));
        return data;
      } catch (fileError) {
        console.warn('Could not read tournaments.json:', fileError);
        return null;
      }
    }

    return null;
  } catch (error) {
    console.error('Error loading tournaments data:', error);
    return null;
  }
}

/**
 * Save tournaments data to Redis (and optionally to file in dev)
 */
export async function saveTournamentsData(data: TournamentsData, creatorId: string = DEFAULT_CREATOR_ID): Promise<void> {
  // Save to Redis (works everywhere)
  const key = getCreatorKey(creatorId, 'tournaments_data');
  await redis.set(key, JSON.stringify(data));
  console.log(`✅ Tournaments data saved to Redis for creator: ${creatorId}`);

  // Try to save to file as well (for local dev convenience) - only for default creator
  if (creatorId === DEFAULT_CREATOR_ID) {
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
}

/**
 * Checks if session has changed in tournaments data and auto-resets draw if needed.
 * Call this at the start of any API that interacts with the draw system.
 */
export async function checkAndResetSession(creatorId: string = DEFAULT_CREATOR_ID): Promise<void> {
  try {
    // Load current session from tournaments data
    const tournamentsData = await getTournamentsData(creatorId);
    if (!tournamentsData) {
      console.warn(`No tournaments data found for creator: ${creatorId}`);
      return;
    }

    const currentSessionId = tournamentsData.sessionId;
    if (!currentSessionId) {
      console.warn('No sessionId found in tournaments data');
      return;
    }

    // Check stored session in Redis
    const sessionKey = getCreatorKey(creatorId, 'current_session_id');
    const storedSessionId = await redis.get(sessionKey);

    // If session changed, auto-reset draw
    if (storedSessionId && storedSessionId !== currentSessionId) {
      console.log(`🔄 Session changed from ${storedSessionId} to ${currentSessionId} - auto-resetting draw for ${creatorId}`);

      // Clear current draw data (but preserve entry_history for leaderboard)
      await redis.del(getCreatorKey(creatorId, 'raffle_entries'));
      await redis.del(getCreatorKey(creatorId, 'raffle_winners'));

      // Update stored session ID
      await redis.set(sessionKey, currentSessionId);

      console.log('✅ Draw auto-reset complete');
    } else if (!storedSessionId) {
      // First time, just store the session ID
      await redis.set(sessionKey, currentSessionId);
      console.log(`📝 Initialized session tracking: ${currentSessionId} for ${creatorId}`);
    }
  } catch (error) {
    console.error('Session check error:', error);
    // Don't throw - allow API to continue even if session check fails
  }
}
