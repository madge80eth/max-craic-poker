import { NextRequest, NextResponse } from 'next/server';
import { getUserStats } from '@/lib/redis';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }

  const stats = await getUserStats(address);
  return NextResponse.json(stats);
}
