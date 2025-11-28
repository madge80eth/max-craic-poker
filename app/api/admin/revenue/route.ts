// app/api/admin/revenue/route.ts
import { NextResponse } from 'next/server';
import { getRevenueStats, getAllTransactions } from '@/lib/revenue-redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get revenue stats and recent transactions
    const [stats, transactions] = await Promise.all([
      getRevenueStats(),
      getAllTransactions(50) // Get last 50 transactions
    ]);

    return NextResponse.json({
      success: true,
      stats,
      transactions
    });
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue data' },
      { status: 500 }
    );
  }
}
