// app/api/membership/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getMembership } from '@/lib/revenue-redis';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    const membership = await getMembership(address.toLowerCase());

    // Check if membership is expired
    if (membership) {
      const isExpired = membership.expiryDate < Date.now();
      if (isExpired && membership.status === 'active') {
        membership.status = 'expired';
      }
    }

    return NextResponse.json({
      success: true,
      membership,
      isMember: membership?.status === 'active' && membership.expiryDate > Date.now()
    });
  } catch (error) {
    console.error('Error checking membership:', error);
    return NextResponse.json(
      { error: 'Failed to check membership status' },
      { status: 500 }
    );
  }
}
