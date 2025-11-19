import { Redis } from '@upstash/redis'
import { UserStats } from '@/types'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function getUserStats(walletAddress: string): Promise<UserStats> {
  const data = await redis.hgetall(`user:${walletAddress}`);

  return {
    walletAddress,
    totalEntries: parseInt((data?.totalEntries as string) || '0'),
    tournamentsAssigned: parseInt((data?.tournamentsAssigned as string) || '0'),
    lastThreeDrawIds: JSON.parse((data?.lastThreeDrawIds as string) || '[]'),
    currentStreak: parseInt((data?.currentStreak as string) || '0')
  };
}

export async function updateUserStats(
  walletAddress: string,
  drawId: string
): Promise<void> {
  const stats = await getUserStats(walletAddress);

  // Add new draw to lastThree
  const lastThree = [...stats.lastThreeDrawIds, drawId].slice(-3);

  // Calculate streak (3 consecutive draws = streak)
  const currentStreak = lastThree.length === 3 ? 3 : lastThree.length;

  const newStats = {
    totalEntries: stats.totalEntries + 1,
    tournamentsAssigned: stats.tournamentsAssigned, // Updated when they win
    lastThreeDrawIds: JSON.stringify(lastThree),
    currentStreak
  };

  console.log(`📊 Updating user stats for ${walletAddress}:`, newStats);

  await redis.hset(`user:${walletAddress}`, newStats);

  console.log(`✅ User stats updated successfully for ${walletAddress}`);
}

export async function incrementTournamentsAssigned(
  walletAddress: string
): Promise<void> {
  await redis.hincrby(`user:${walletAddress}`, 'tournamentsAssigned', 1);
}