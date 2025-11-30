import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface PayoutRecord {
  id: string;
  date: string;
  tournament: string;
  percentage: number;
  usdcAmount: number;
  basescanUrl: string;
  position: number;
  createdAt: number;
}

// POST - Create a new payout record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tournament, percentage, usdcAmount, basescanUrl, position } = body;

    // Validation
    if (!tournament || !percentage || !usdcAmount || !basescanUrl || !position) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create record
    const record: PayoutRecord = {
      id: `payout_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      date: new Date().toISOString(),
      tournament,
      percentage: parseFloat(percentage),
      usdcAmount: parseFloat(usdcAmount),
      basescanUrl,
      position: parseInt(position),
      createdAt: Date.now()
    };

    // Get existing records
    const existingRecords = await redis.get<PayoutRecord[]>('payout_records') || [];

    // Add new record at the beginning (most recent first)
    const updatedRecords = [record, ...existingRecords];

    // Save to Redis
    await redis.set('payout_records', updatedRecords);

    return NextResponse.json({
      success: true,
      record
    });

  } catch (error) {
    console.error('Payout record creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create payout record', error: String(error) },
      { status: 500 }
    );
  }
}

// GET - Retrieve all payout records
export async function GET() {
  try {
    const records = await redis.get<PayoutRecord[]>('payout_records') || [];

    return NextResponse.json({
      success: true,
      records
    });

  } catch (error) {
    console.error('Payout records fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payout records', error: String(error) },
      { status: 500 }
    );
  }
}
