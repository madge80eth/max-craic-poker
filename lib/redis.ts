import { Redis } from '@upstash/redis'
import { UserStats } from '@/types'
import { HandResult, Card, dealHand, evaluateHand, calculateTickets, compareHands } from './poker'

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

// ============================================
// MADGE GAME - Daily Hand & Ticket Accumulation
// ============================================

// Get today's date string (YYYY-MM-DD in UTC)
function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

// Redis key for user's daily hand
function getDailyHandKey(walletAddress: string, dateKey: string): string {
  return `user:${walletAddress}:daily:${dateKey}:hand`;
}

// Redis key for all hands played today (for placement calculation)
function getDailyHandsKey(dateKey: string): string {
  return `daily:${dateKey}:hands`;
}

// Redis key for user's accumulated tickets
function getTicketsKey(walletAddress: string): string {
  return `user:${walletAddress}:tickets`;
}

// Check if user has already played today
export async function hasUserPlayedToday(walletAddress: string): Promise<boolean> {
  const dateKey = getTodayKey();
  const key = getDailyHandKey(walletAddress, dateKey);
  const exists = await redis.exists(key);
  return exists === 1;
}

// Get user's hand result for today
export async function getTodayHandResult(walletAddress: string): Promise<HandResult | null> {
  const dateKey = getTodayKey();
  const key = getDailyHandKey(walletAddress, dateKey);
  const data = await redis.get(key);
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data as HandResult;
}

// Get user's total accumulated tickets
export async function getUserTickets(walletAddress: string): Promise<number> {
  const key = getTicketsKey(walletAddress);
  const tickets = await redis.get(key);
  return parseInt(tickets as string || '0');
}

// Add tickets to user's accumulated total
export async function addUserTickets(walletAddress: string, amount: number): Promise<number> {
  const key = getTicketsKey(walletAddress);
  const newTotal = await redis.incrby(key, amount);
  console.log(`🎟️ Added ${amount} tickets to ${walletAddress}. New total: ${newTotal}`);
  return newTotal;
}

// Use all accumulated tickets (called when entering draw)
export async function useAllTickets(walletAddress: string): Promise<number> {
  const key = getTicketsKey(walletAddress);
  const tickets = await redis.get(key);
  const ticketCount = parseInt(tickets as string || '0');

  if (ticketCount > 0) {
    await redis.set(key, '0');
    console.log(`🎫 Used ${ticketCount} tickets for ${walletAddress}`);
  }

  return ticketCount;
}

// Store user's daily hand and add tickets to accumulation
// ticketMultiplier: 2 for Base app users, 1 for others
export async function storeDailyHand(walletAddress: string, ticketMultiplier: number = 1): Promise<{ handResult: HandResult; totalTickets: number }> {
  const dateKey = getTodayKey();

  // Generate hand
  const cards = dealHand();
  const { rankValue, rankName, subRank } = evaluateHand(cards);
  const playedAt = Date.now();

  // Store in today's hands list for ranking
  const dailyHandsKey = getDailyHandsKey(dateKey);
  const handData = {
    walletAddress,
    rankValue,
    subRank,
    playedAt
  };
  await redis.zadd(dailyHandsKey, {
    score: rankValue * 1000000 + subRank,
    member: JSON.stringify(handData)
  });

  // Get total users today and calculate placement
  const totalUsers = await redis.zcard(dailyHandsKey);
  const rank = await redis.zrevrank(dailyHandsKey, JSON.stringify(handData));
  const placement = (rank ?? totalUsers - 1) + 1;

  // Calculate tickets based on hand strength (not placement)
  const baseTickets = calculateTickets(rankValue);

  // Apply multiplier (2x for Base app users)
  const ticketsEarned = Math.floor(baseTickets * ticketMultiplier);

  // Create full result
  const handResult: HandResult = {
    cards,
    handRank: rankName,
    rankValue,
    subRank,
    placement,
    totalUsers,
    ticketsEarned,
    playedAt
  };

  // Store user's daily hand result
  const handKey = getDailyHandKey(walletAddress, dateKey);
  await redis.set(handKey, JSON.stringify(handResult));

  // Add tickets to user's accumulated total
  const totalTickets = await addUserTickets(walletAddress, ticketsEarned);

  const multiplierText = ticketMultiplier > 1 ? ` (${ticketMultiplier}x multiplier)` : '';
  console.log(`🎴 Daily hand for ${walletAddress}: ${rankName} - Earned ${ticketsEarned} tickets${multiplierText} - Total: ${totalTickets}`);

  return { handResult, totalTickets };
}

// Recalculate placement for today's hand
export async function recalculateTodayPlacement(walletAddress: string): Promise<HandResult | null> {
  const dateKey = getTodayKey();
  const handKey = getDailyHandKey(walletAddress, dateKey);
  const existingData = await redis.get(handKey);

  if (!existingData) return null;

  const result: HandResult = typeof existingData === 'string'
    ? JSON.parse(existingData)
    : existingData as HandResult;

  // Get current total users today
  const dailyHandsKey = getDailyHandsKey(dateKey);
  const totalUsers = await redis.zcard(dailyHandsKey);

  // Recalculate placement
  const handData = {
    walletAddress,
    rankValue: result.rankValue,
    subRank: result.subRank,
    playedAt: result.playedAt
  };
  const rank = await redis.zrevrank(dailyHandsKey, JSON.stringify(handData));
  const placement = (rank ?? totalUsers - 1) + 1;

  // Note: We don't recalculate tickets since they were already added when played
  // Just update placement display
  if (placement !== result.placement || totalUsers !== result.totalUsers) {
    result.placement = placement;
    result.totalUsers = totalUsers;
    await redis.set(handKey, JSON.stringify(result));
  }

  return result;
}

// Clear a user's daily hand and tickets (for reset)
export async function clearUserDailyData(walletAddress: string): Promise<void> {
  const dateKey = getTodayKey();
  const handKey = getDailyHandKey(walletAddress, dateKey);
  const ticketsKey = getTicketsKey(walletAddress);

  await redis.del(handKey);
  await redis.del(ticketsKey);

  console.log(`🗑️ Cleared daily hand and tickets for ${walletAddress}`);
}

// Clear today's daily hands sorted set
export async function clearTodayDailyHands(): Promise<void> {
  const dateKey = getTodayKey();
  const dailyHandsKey = getDailyHandsKey(dateKey);
  await redis.del(dailyHandsKey);
  console.log(`🗑️ Cleared daily hands sorted set for ${dateKey}`);
}

// Get all wallet addresses that have played today (from the sorted set)
export async function getTodayPlayers(): Promise<string[]> {
  const dateKey = getTodayKey();
  const dailyHandsKey = getDailyHandsKey(dateKey);

  // Get all members from the sorted set
  const members = await redis.zrange(dailyHandsKey, 0, -1);

  // Extract wallet addresses from the JSON members
  const wallets: string[] = [];
  for (const member of members) {
    try {
      const data = typeof member === 'string' ? JSON.parse(member) : member;
      if (data.walletAddress) {
        wallets.push(data.walletAddress);
      }
    } catch {
      // Skip invalid entries
    }
  }

  return wallets;
}