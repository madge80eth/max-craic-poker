// Founder grant distribution system
// Founders (first 5 creators + Jaylee) receive 10% of platform grants split equally
import { redis } from './redis';
import { getAllCreators } from './creator-redis';

/**
 * Grant distribution record
 */
export interface GrantDistribution {
  id: string; // grant_dist_{timestamp}_{random}
  timestamp: number;
  totalGrantAmount: number; // Total grant received by platform (in cents)
  founderShareAmount: number; // 10% of grant for founders (in cents)
  perFounderAmount: number; // Amount each founder receives (in cents)
  founderCount: number; // Number of founders at time of distribution
  founderIds: string[]; // List of founder IDs who received shares
  txHashes?: string[]; // On-chain transaction hashes (once distributed)
  status: 'pending' | 'distributed' | 'failed';
  distributedAt?: number; // Timestamp when distributed
  notes?: string; // Optional notes (e.g., "Base Foundation Grant Q1 2025")
}

/**
 * Redis Schema:
 * - grant_distributions:all → ZSET of grant distribution IDs (scored by timestamp)
 * - grant_distribution:{id} → HASH with distribution data
 */

/**
 * Get all active founders (isFounder = true)
 */
export async function getActiveFounders(): Promise<string[]> {
  const allCreators = await getAllCreators();
  return allCreators
    .filter(c => c.isFounder && c.isActive)
    .map(c => c.id);
}

/**
 * Create a new grant distribution record
 *
 * @param totalGrantAmount - Total grant amount received (in cents)
 * @param notes - Optional notes about the grant
 * @returns Grant distribution record
 */
export async function createGrantDistribution(
  totalGrantAmount: number,
  notes?: string
): Promise<GrantDistribution> {
  // Get current founders
  const founderIds = await getActiveFounders();
  const founderCount = founderIds.length;

  if (founderCount === 0) {
    throw new Error('No active founders found');
  }

  // Calculate founder share (10% of total grant)
  const founderShareAmount = Math.round(totalGrantAmount * 0.1);
  const perFounderAmount = Math.floor(founderShareAmount / founderCount);

  // Generate unique ID
  const randomStr = Math.floor(Math.random() * 1000000).toString(36);
  const timestamp = Date.now();
  const id = `grant_dist_${timestamp}_${randomStr}`;

  const distribution: GrantDistribution = {
    id,
    timestamp,
    totalGrantAmount,
    founderShareAmount,
    perFounderAmount,
    founderCount,
    founderIds,
    status: 'pending',
    notes
  };

  // Store in Redis
  await redis.hset(`grant_distribution:${id}`, {
    timestamp,
    totalGrantAmount,
    founderShareAmount,
    perFounderAmount,
    founderCount,
    founderIds: JSON.stringify(founderIds),
    status: 'pending',
    notes: notes || ''
  });

  // Add to sorted set
  await redis.zadd('grant_distributions:all', {
    score: timestamp,
    member: id
  });

  console.log(`✅ Grant distribution created: ${id}`);
  console.log(`   Total grant: $${(totalGrantAmount / 100).toFixed(2)}`);
  console.log(`   Founder share (10%): $${(founderShareAmount / 100).toFixed(2)}`);
  console.log(`   Per founder (${founderCount}): $${(perFounderAmount / 100).toFixed(2)}`);

  return distribution;
}

/**
 * Get a grant distribution by ID
 */
export async function getGrantDistribution(id: string): Promise<GrantDistribution | null> {
  const data = await redis.hgetall(`grant_distribution:${id}`);

  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  return {
    id,
    timestamp: parseInt(data.timestamp as string),
    totalGrantAmount: parseInt(data.totalGrantAmount as string),
    founderShareAmount: parseInt(data.founderShareAmount as string),
    perFounderAmount: parseInt(data.perFounderAmount as string),
    founderCount: parseInt(data.founderCount as string),
    founderIds: JSON.parse(data.founderIds as string),
    txHashes: data.txHashes ? JSON.parse(data.txHashes as string) : undefined,
    status: data.status as 'pending' | 'distributed' | 'failed',
    distributedAt: data.distributedAt ? parseInt(data.distributedAt as string) : undefined,
    notes: data.notes as string || undefined
  };
}

/**
 * Mark a grant distribution as distributed
 *
 * @param id - Distribution ID
 * @param txHashes - On-chain transaction hashes
 */
export async function markGrantDistributed(
  id: string,
  txHashes: string[]
): Promise<void> {
  const distribution = await getGrantDistribution(id);
  if (!distribution) {
    throw new Error(`Grant distribution not found: ${id}`);
  }

  const distributedAt = Date.now();

  await redis.hset(`grant_distribution:${id}`, {
    status: 'distributed',
    distributedAt,
    txHashes: JSON.stringify(txHashes)
  });

  console.log(`✅ Grant distribution marked as distributed: ${id}`);
}

/**
 * Get all grant distributions (sorted by timestamp, newest first)
 *
 * @param limit - Max number of distributions to return
 * @returns Array of grant distributions
 */
export async function getAllGrantDistributions(limit: number = 100): Promise<GrantDistribution[]> {
  const ids = await redis.zrange('grant_distributions:all', 0, limit - 1, { rev: true });

  if (!ids || ids.length === 0) {
    return [];
  }

  const distributions = await Promise.all(
    ids.map(id => getGrantDistribution(id as string))
  );

  return distributions.filter((d): d is GrantDistribution => d !== null);
}

/**
 * Get total grants distributed to founders
 *
 * @returns Total amount distributed in cents
 */
export async function getTotalGrantsDistributed(): Promise<number> {
  const distributions = await getAllGrantDistributions(1000);
  return distributions
    .filter(d => d.status === 'distributed')
    .reduce((sum, d) => sum + d.founderShareAmount, 0);
}

/**
 * Get grant distribution stats for a specific founder
 *
 * @param founderId - Creator ID
 * @returns Stats about founder's grant earnings
 */
export async function getFounderGrantStats(founderId: string): Promise<{
  totalReceived: number; // Total grants received (in cents)
  distributionCount: number; // Number of distributions participated in
  lastDistribution?: number; // Timestamp of last distribution
}> {
  const distributions = await getAllGrantDistributions(1000);

  const founderDistributions = distributions.filter(
    d => d.status === 'distributed' && d.founderIds.includes(founderId)
  );

  const totalReceived = founderDistributions.reduce(
    (sum, d) => sum + d.perFounderAmount,
    0
  );

  const lastDistribution = founderDistributions.length > 0
    ? founderDistributions[0].distributedAt
    : undefined;

  return {
    totalReceived,
    distributionCount: founderDistributions.length,
    lastDistribution
  };
}
