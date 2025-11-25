import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const MAX_TOKENS_PER_REQUEST = 100;
const NOTIFICATION_ID_PREFIX = 'draw_';

interface NotificationToken {
  fid: string;
  url: string;
  token: string;
  enabledAt: number;
}

/**
 * Send notifications to users using stored tokens
 * Following Farcaster Mini App notification specification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, message, targetUrl, notificationId, targetFids } = body;

    // Validate required fields (per Farcaster spec)
    if (!title || !message) {
      return NextResponse.json(
        { success: false, message: 'Title and message are required' },
        { status: 400 }
      );
    }

    // Validate character limits (Farcaster spec)
    if (title.length > 32) {
      return NextResponse.json(
        { success: false, message: 'Title must be 32 characters or less' },
        { status: 400 }
      );
    }

    if (message.length > 128) {
      return NextResponse.json(
        { success: false, message: 'Message must be 128 characters or less' },
        { status: 400 }
      );
    }

    // Get all stored notification tokens
    const tokensData = await redis.hgetall('notification_tokens');

    if (!tokensData || Object.keys(tokensData).length === 0) {
      return NextResponse.json(
        { success: false, message: 'No notification tokens found' },
        { status: 404 }
      );
    }

    // Parse tokens and filter if targetFids specified
    const tokens: string[] = [];
    const tokenUrls: Set<string> = new Set();

    for (const [fid, data] of Object.entries(tokensData)) {
      try {
        const tokenData: NotificationToken = typeof data === 'string' ? JSON.parse(data) : data;

        // If targetFids specified, only include those FIDs
        if (targetFids && Array.isArray(targetFids)) {
          if (!targetFids.includes(fid)) {
            continue;
          }
        }

        tokens.push(tokenData.token);
        tokenUrls.add(tokenData.url);
      } catch (error) {
        console.error(`Failed to parse token for FID ${fid}:`, error);
      }
    }

    if (tokens.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid notification tokens to send to' },
        { status: 404 }
      );
    }

    // Limit to 100 tokens per request (Farcaster spec)
    const tokensToSend = tokens.slice(0, MAX_TOKENS_PER_REQUEST);

    // Generate notification ID for deduplication (max 128 chars)
    const finalNotificationId = notificationId || `${NOTIFICATION_ID_PREFIX}${Date.now()}`;

    // Get the notification URL (should be same for all tokens from same client)
    const notificationUrl = Array.from(tokenUrls)[0];

    if (!notificationUrl) {
      return NextResponse.json(
        { success: false, message: 'No notification URL found' },
        { status: 500 }
      );
    }

    // Build notification payload per Farcaster spec
    const payload = {
      notificationId: finalNotificationId.substring(0, 128),
      title: title.substring(0, 32),
      body: message.substring(0, 128),
      targetUrl: targetUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/mini-app/draw`,
      tokens: tokensToSend
    };

    console.log(`📤 Sending notification to ${tokensToSend.length} users`);
    console.log(`📝 Notification: "${title}" - "${message}"`);

    // Send notification to Warpcast
    const response = await fetch(notificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Notification send failed:', errorText);
      return NextResponse.json(
        { success: false, message: 'Failed to send notification', error: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();

    console.log(`✅ Notification sent successfully to ${tokensToSend.length} users`);

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      recipientCount: tokensToSend.length,
      notificationId: finalNotificationId,
      data: result
    });

  } catch (error) {
    console.error('❌ Send notification error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}
