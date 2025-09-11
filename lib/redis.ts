import Redis from 'ioredis'

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  tls: process.env.NODE_ENV === 'production' ? {} : undefined,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
})