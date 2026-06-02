import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function DELETE() {
  const keys = await redis.keys('craic:*');
  if (keys.length > 0) {
    await redis.del(...(keys as [string, ...string[]]));
  }
  return NextResponse.json({ deleted: keys.length });
}
