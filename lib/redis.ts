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
// MADGE GAME - Hand Storage & Retrieval
// ============================================

// Redis key pattern: user:{wallet}:draw:{sessionId}:hand
function getHandKey(walletAddress: string, sessionId: string): string {
  return `user:${walletAddress}:draw:${sessionId}:hand`;
}

// Redis key for all hands in a draw session (for placement calculation)
function getDrawHandsKey(sessionId: string): string {
  return `draw:${sessionId}:hands`;
}

// Check if user has already played in this draw
export async function hasUserPlayedDraw(
  walletAddress: string,
  sessionId: string
): Promise<boolean> {
  const key = getHandKey(walletAddress, sessionId);
  const exists = await redis.exists(key);
  return exists === 1;
}

// Get user's hand result for this draw
export async function getUserHandResult(
  walletAddress: string,
  sessionId: string
): Promise<HandResult | null> {
  const key = getHandKey(walletAddress, sessionId);
  const data = await redis.get(key);
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data as HandResult;
}

// Store user's hand and calculate placement
export async function storeUserHand(
  walletAddress: string,
  sessionId: string
): Promise<HandResult> {
  // Generate hand
  const cards = dealHand();
  const { rankValue, rankName, subRank } = evaluateHand(cards);
  const playedAt = Date.now();

  // Store in the draw's hands list for ranking
  const drawHandsKey = getDrawHandsKey(sessionId);
  const handData = {
    walletAddress,
    rankValue,
    subRank,
    playedAt
  };
  await redis.zadd(drawHandsKey, {
    score: rankValue * 1000000 + subRank, // Composite score for ranking
    member: JSON.stringify(handData)
  });

  // Get total users and calculate placement
  const totalUsers = await redis.zcard(drawHandsKey);

  // Get rank (zrevrank gives 0-indexed position from highest score)
  // Higher score = better hand = lower placement number
  const rank = await redis.zrevrank(drawHandsKey, JSON.stringify(handData));
  const placement = (rank ?? totalUsers - 1) + 1; // 1-indexed

  // Calculate tickets based on percentile
  const ticketsEarned = calculateTickets(placement, totalUsers);

  // Create full result
  const result: HandResult = {
    cards,
    handRank: rankName,
    rankValue,
    subRank,
    placement,
    totalUsers,
    ticketsEarned,
    playedAt
  };

  // Store user's full hand result
  const handKey = getHandKey(walletAddress, sessionId);
  await redis.set(handKey, JSON.stringify(result));

  console.log(`🎴 Stored hand for ${walletAddress}: ${rankName} - Placement ${placement}/${totalUsers} - ${ticketsEarned} tickets`);

  return result;
}

// Recalculate placement for a user (called when fetching status)
export async function recalculatePlacement(
  walletAddress: string,
  sessionId: string
): Promise<HandResult | null> {
  const handKey = getHandKey(walletAddress, sessionId);
  const existingData = await redis.get(handKey);

  if (!existingData) return null;

  const result: HandResult = typeof existingData === 'string'
    ? JSON.parse(existingData)
    : existingData as HandResult;

  // Get current total users
  const drawHandsKey = getDrawHandsKey(sessionId);
  const totalUsers = await redis.zcard(drawHandsKey);

  // Recalculate placement
  const handData = {
    walletAddress,
    rankValue: result.rankValue,
    subRank: result.subRank,
    playedAt: result.playedAt
  };
  const rank = await redis.zrevrank(drawHandsKey, JSON.stringify(handData));
  const placement = (rank ?? totalUsers - 1) + 1;

  // Recalculate tickets
  const ticketsEarned = calculateTickets(placement, totalUsers);

  // Update if changed
  if (placement !== result.placement || totalUsers !== result.totalUsers || ticketsEarned !== result.ticketsEarned) {
    result.placement = placement;
    result.totalUsers = totalUsers;
    result.ticketsEarned = ticketsEarned;
    await redis.set(handKey, JSON.stringify(result));
  }

  return result;
}