// app/api/membership/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getMembership, getMembershipSettings } from '@/lib/revenue-redis';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    const [membership, settings] = await Promise.all([
      getMembership(walletAddress.toLowerCase()),
      getMembershipSettings()
    ]);

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
      settings,
      isMember: membership?.status === 'active' && membership.expiryDate > Date.now()
    });
  } catch (error) {
    console.error('Error fetching membership status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch membership status' },
      { status: 500 }
    );
  }
}
