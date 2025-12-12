import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface HothSettings {
  enabled: boolean;
  streamDelaySeconds: number;
}

// GET - Retrieve HOTH settings
export async function GET() {
  try {
    const settings = await redis.get<HothSettings>('hoth:settings');

    // Default settings if none exist
    const defaultSettings: HothSettings = {
      enabled: false,
      streamDelaySeconds: 0
    };

    return NextResponse.json({
      success: true,
      settings: settings || defaultSettings
    });

  } catch (error) {
    console.error('HOTH settings fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch HOTH settings', error: String(error) },
      { status: 500 }
    );
  }
}

// POST - Update HOTH settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { enabled, streamDelaySeconds } = body;

    // Validation
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'enabled must be a boolean' },
        { status: 400 }
      );
    }

    if (typeof streamDelaySeconds !== 'number' || streamDelaySeconds < 0) {
      return NextResponse.json(
        { success: false, message: 'streamDelaySeconds must be a non-negative number' },
        { status: 400 }
      );
    }

    const settings: HothSettings = {
      enabled,
      streamDelaySeconds
    };

    // Save to Redis
    await redis.set('hoth:settings', settings);

    return NextResponse.json({
      success: true,
      settings
    });

  } catch (error) {
    console.error('HOTH settings save error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save HOTH settings', error: String(error) },
      { status: 500 }
    );
  }
}
