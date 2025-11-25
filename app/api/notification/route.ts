import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const FARCASTER_API_URL = 'https://api.farcaster.xyz/notifications';
const MAX_TITLE_LENGTH = 32; // Per Base guidelines
const MAX_BODY_LENGTH = 128; // Per Base guidelines
const MAX_NOTIFICATIONS_PER_30_SECONDS = 1;
const MAX_NOTIFICATIONS_PER_DAY = 100;

/**
 * MiniKit notification proxy endpoint
 * Validates and forwards notifications to Farcaster API
 * Following Base Mini App notification guidelines
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, body: messageBody, targetFid, actionUrl } = body;

    // Validate required fields
    if (!title || !messageBody) {
      return NextResponse.json(
        { success: false, message: 'Title and body are required' },
        { status: 400 }
      );
    }

    // Validate character limits per Base guidelines
    if (title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json(
        { success: false, message: `Title must be ${MAX_TITLE_LENGTH} characters or less` },
        { status: 400 }
      );
    }

    if (messageBody.length > MAX_BODY_LENGTH) {
      return NextResponse.json(
        { success: false, message: `Body must be ${MAX_BODY_LENGTH} characters or less` },
        { status: 400 }
      );
    }

    // Rate limiting: 1 notification every 30 seconds
    const rateLimitKey = 'notification:rate_limit';
    const lastNotificationTime = await redis.get<number>(rateLimitKey);
    const now = Date.now();

    if (lastNotificationTime && (now - lastNotificationTime) < 30000) {
      const waitTime = Math.ceil((30000 - (now - lastNotificationTime)) / 1000);
      return NextResponse.json(
        { success: false, message: `Rate limit: wait ${waitTime} seconds` },
        { status: 429 }
      );
    }

    // Daily limit: 100 notifications per day
    const today = new Date().toISOString().split('T')[0];
    const dailyCountKey = `notification:daily:${today}`;
    const dailyCount = (await redis.get<number>(dailyCountKey)) || 0;

    if (dailyCount >= MAX_NOTIFICATIONS_PER_DAY) {
      return NextResponse.json(
        { success: false, message: 'Daily notification limit reached (100/day)' },
        { status: 429 }
      );
    }

    // Check environment variables
    const apiKey = process.env.FARCASTER_API_KEY;
    const miniAppId = process.env.MINI_APP_ID;
    const miniAppUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.MINI_APP_URL;

    if (!apiKey || !miniAppId || !miniAppUrl) {
      console.error('Missing required environment variables for notifications');
      return NextResponse.json(
        { success: false, message: 'Notification service not configured' },
        { status: 500 }
      );
    }

    // Forward to Farcaster API
    const notificationPayload = {
      title,
      body: messageBody,
      miniAppId,
      actionUrl: actionUrl || miniAppUrl,
      ...(targetFid && { targetFid })
    };

    const response = await fetch(FARCASTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(notificationPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Farcaster API error:', errorText);
      return NextResponse.json(
        { success: false, message: 'Failed to send notification' },
        { status: response.status }
      );
    }

    // Update rate limits
    await redis.set(rateLimitKey, now);
    await redis.incr(dailyCountKey);
    await redis.expire(dailyCountKey, 86400); // Expire after 24 hours

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      data: result
    });

  } catch (error) {
    console.error('Notification proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}
