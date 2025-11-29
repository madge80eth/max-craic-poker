// app/api/membership/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createMembership, renewMembership, getMembership, getMembershipSettings, recordTransaction } from '@/lib/revenue-redis';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, txHash, amount } = body;

    // Validation
    if (!walletAddress || !txHash || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields (walletAddress, txHash, amount)' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    const settings = await getMembershipSettings();

    if (!settings.enabled) {
      return NextResponse.json(
        { error: 'Membership system is not enabled' },
        { status: 400 }
      );
    }

    // Check if payment amount matches monthly fee
    if (amount !== settings.monthlyFeeUSDC) {
      return NextResponse.json(
        { error: `Payment must be ${settings.monthlyFeeUSDC} cents ($${(settings.monthlyFeeUSDC / 100).toFixed(2)})` },
        { status: 400 }
      );
    }

    // Check if already has membership
    const existing = await getMembership(walletAddress.toLowerCase());

    let membership;
    if (existing && existing.status === 'active' && existing.expiryDate > Date.now()) {
      // Renew existing membership
      membership = await renewMembership(walletAddress.toLowerCase(), amount, txHash);
    } else {
      // Create new membership
      membership = await createMembership(walletAddress.toLowerCase(), amount, txHash);
    }

    // Record transaction for revenue tracking
    await recordTransaction({
      type: 'membership',
      amount,
      tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
      tokenSymbol: 'USDC',
      walletAddress: walletAddress.toLowerCase(),
      timestamp: Date.now(),
      txHash,
      metadata: {
        monthlyFee: settings.monthlyFeeUSDC
      }
    });

    console.log(`✅ Membership ${existing ? 'renewed' : 'created'}: ${walletAddress} ($${(amount / 100).toFixed(2)})`);

    return NextResponse.json({
      success: true,
      message: existing ? 'Membership renewed successfully!' : 'Welcome! Membership activated!',
      membership
    });

  } catch (error) {
    console.error('❌ Membership subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to process membership subscription', details: String(error) },
      { status: 500 }
    );
  }
}
