// lib/revenue-redis.ts
import { redis } from './redis';
import { Transaction, TransactionType, RevenueStats, Membership, MembershipSettings } from '@/types';

/**
 * Redis Keys:
 * - transactions:all - ZSET of all transaction IDs (scored by timestamp)
 * - transaction:{id} - Transaction metadata (hash)
 * - membership:{wallet} - Membership data (hash)
 * - membership_settings - Membership settings (hash)
 * - revenue_stats - Cached revenue stats (hash)
 */

// ============================================
// MEMBERSHIP MANAGEMENT
// ============================================

export async function getMembershipSettings(): Promise<MembershipSettings> {
  const data = await redis.hgetall('membership_settings');

  if (!data || Object.keys(data).length === 0) {
    // Default settings
    return {
      enabled: false,
      monthlyFeeUSDC: 1000, // $10.00 default
      benefits: [
        'In-depth tournament hand history reviews',
        'Exclusive strategy content',
        'Early access to videos'
      ],
      requireMembershipForRaffle: false
    };
  }

  return {
    enabled: data.enabled === 'true',
    monthlyFeeUSDC: parseInt(data.monthlyFeeUSDC as string),
    benefits: JSON.parse(data.benefits as string),
    requireMembershipForRaffle: data.requireMembershipForRaffle === 'true'
  };
}

export async function saveMembershipSettings(settings: MembershipSettings): Promise<void> {
  await redis.hset('membership_settings', {
    enabled: settings.enabled ? 'true' : 'false',
    monthlyFeeUSDC: settings.monthlyFeeUSDC,
    benefits: JSON.stringify(settings.benefits),
    requireMembershipForRaffle: settings.requireMembershipForRaffle ? 'true' : 'false'
  });
}

export async function getMembership(walletAddress: string): Promise<Membership | null> {
  const data = await redis.hgetall(`membership:${walletAddress}`);

  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  return {
    walletAddress,
    startDate: parseInt(data.startDate as string),
    lastPaymentDate: parseInt(data.lastPaymentDate as string),
    expiryDate: parseInt(data.expiryDate as string),
    status: data.status as 'active' | 'expired' | 'cancelled',
    totalPaid: parseInt(data.totalPaid as string),
    txHashes: JSON.parse(data.txHashes as string)
  };
}

export async function createMembership(
  walletAddress: string,
  paymentAmount: number,
  txHash: string
): Promise<Membership> {
  const now = Date.now();
  const expiryDate = now + (30 * 24 * 60 * 60 * 1000); // 30 days

  const membership: Membership = {
    walletAddress,
    startDate: now,
    lastPaymentDate: now,
    expiryDate,
    status: 'active',
    totalPaid: paymentAmount,
    txHashes: [txHash]
  };

  await redis.hset(`membership:${walletAddress}`, {
    startDate: now,
    lastPaymentDate: now,
    expiryDate,
    status: 'active',
    totalPaid: paymentAmount,
    txHashes: JSON.stringify([txHash])
  });

  return membership;
}

export async function renewMembership(
  walletAddress: string,
  paymentAmount: number,
  txHash: string
): Promise<Membership> {
  const existing = await getMembership(walletAddress);

  if (!existing) {
    return createMembership(walletAddress, paymentAmount, txHash);
  }

  const now = Date.now();
  const newExpiryDate = Math.max(existing.expiryDate, now) + (30 * 24 * 60 * 60 * 1000);

  const updated: Membership = {
    ...existing,
    lastPaymentDate: now,
    expiryDate: newExpiryDate,
    status: 'active',
    totalPaid: existing.totalPaid + paymentAmount,
    txHashes: [...existing.txHashes, txHash]
  };

  await redis.hset(`membership:${walletAddress}`, {
    lastPaymentDate: now,
    expiryDate: newExpiryDate,
    status: 'active',
    totalPaid: updated.totalPaid,
    txHashes: JSON.stringify(updated.txHashes)
  });

  return updated;
}

export async function getActiveMembershipsCount(): Promise<number> {
  const keys = await redis.keys('membership:*');
  if (!keys || keys.length === 0) return 0;

  let activeCount = 0;
  for (const key of keys) {
    const data = await redis.hgetall(key);
    if (data && data.status === 'active') {
      const expiryDate = parseInt(data.expiryDate as string);
      if (expiryDate > Date.now()) {
        activeCount++;
      } else {
        // Auto-expire if past expiry date
        await redis.hset(key, { status: 'expired' });
      }
    }
  }

  return activeCount;
}

export async function getAllMemberships(): Promise<Membership[]> {
  const keys = await redis.keys('membership:*');
  if (!keys || keys.length === 0) return [];

  const memberships: Membership[] = [];
  for (const key of keys) {
    const walletAddress = key.replace('membership:', '');
    const membership = await getMembership(walletAddress);
    if (membership) {
      memberships.push(membership);
    }
  }

  return memberships.sort((a, b) => b.startDate - a.startDate);
}

// ============================================
// TRANSACTION TRACKING
// ============================================

export async function recordTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
  const randomStr = Math.floor(Math.random() * 1000000).toString(36);
  const id = `tx_${transaction.timestamp}_${randomStr}`;

  const fullTransaction: Transaction = {
    ...transaction,
    id
  };

  // Store transaction
  await redis.hset(`transaction:${id}`, {
    type: transaction.type,
    amount: transaction.amount,
    tokenAddress: transaction.tokenAddress || '',
    tokenSymbol: transaction.tokenSymbol || '',
    walletAddress: transaction.walletAddress,
    timestamp: transaction.timestamp,
    txHash: transaction.txHash || '',
    metadata: JSON.stringify(transaction.metadata || {})
  });

  // Add to sorted set (scored by timestamp)
  await redis.zadd('transactions:all', {
    score: transaction.timestamp,
    member: id
  });

  // Invalidate revenue stats cache
  await redis.del('revenue_stats');

  return fullTransaction;
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  const data = await redis.hgetall(`transaction:${id}`);

  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  return {
    id,
    type: data.type as TransactionType,
    amount: parseInt(data.amount as string),
    tokenAddress: data.tokenAddress as string || undefined,
    tokenSymbol: data.tokenSymbol as string || undefined,
    walletAddress: data.walletAddress as string,
    timestamp: parseInt(data.timestamp as string),
    txHash: data.txHash as string || undefined,
    metadata: data.metadata ? JSON.parse(data.metadata as string) : undefined
  };
}

export async function getAllTransactions(limit: number = 100): Promise<Transaction[]> {
  // Get most recent transaction IDs
  const txIds = await redis.zrevrange('transactions:all', 0, limit - 1);

  if (!txIds || txIds.length === 0) {
    return [];
  }

  // Fetch all transactions
  const transactions = await Promise.all(
    txIds.map(id => getTransaction(id as string))
  );

  return transactions.filter((tx): tx is Transaction => tx !== null);
}

export async function getRevenueStats(): Promise<RevenueStats> {
  // Check cache first
  const cached = await redis.hgetall('revenue_stats');

  if (cached && Object.keys(cached).length > 0) {
    const cacheTimestamp = parseInt(cached.cachedAt as string);
    const fiveMinutes = 5 * 60 * 1000;

    // Return cache if less than 5 minutes old
    if (Date.now() - cacheTimestamp < fiveMinutes) {
      return {
        totalVolume: parseInt(cached.totalVolume as string),
        totalTips: parseInt(cached.totalTips as string),
        totalMemberships: parseInt(cached.totalMemberships as string),
        totalRaffleDistributions: parseInt(cached.totalRaffleDistributions as string),
        platformCut: parseInt(cached.platformCut as string),
        transactionCount: parseInt(cached.transactionCount as string),
        activeMemberships: parseInt(cached.activeMemberships as string)
      };
    }
  }

  // Calculate from scratch
  const transactions = await getAllTransactions(10000); // Get all

  let totalVolume = 0;
  let totalTips = 0;
  let totalMemberships = 0;
  let totalRaffleDistributions = 0;

  for (const tx of transactions) {
    totalVolume += tx.amount;

    if (tx.type === 'tip') {
      totalTips += tx.amount;
    } else if (tx.type === 'membership') {
      totalMemberships += tx.amount;
    } else if (tx.type === 'raffle_distribution') {
      totalRaffleDistributions += tx.amount;
    }
  }

  const platformCut = Math.round(totalVolume * 0.02); // 2%
  const activeMemberships = await getActiveMembershipsCount();

  const stats: RevenueStats = {
    totalVolume,
    totalTips,
    totalMemberships,
    totalRaffleDistributions,
    platformCut,
    transactionCount: transactions.length,
    activeMemberships
  };

  // Cache for 5 minutes
  await redis.hset('revenue_stats', {
    ...stats,
    cachedAt: Date.now()
  } as any);

  return stats;
}
