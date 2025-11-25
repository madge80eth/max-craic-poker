import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Farcaster Mini App Webhook Endpoint
 * Receives notification tokens and events from Warpcast/Farcaster clients
 *
 * Events received:
 * - notifications_enabled: User enables notifications, includes token
 * - notifications_disabled: User disables notifications
 * - miniapp_added: User adds the app
 * - miniapp_removed: User removes the app
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📥 Webhook received:', JSON.stringify(body, null, 2));

    const { event, data } = body;

    if (!event || !data) {
      return NextResponse.json(
        { success: false, message: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    const { fid, notificationDetails } = data;

    switch (event) {
      case 'notifications_enabled':
        // Store the notification token when user enables notifications
        if (notificationDetails?.url && notificationDetails?.token) {
          const tokenData = {
            fid,
            url: notificationDetails.url,
            token: notificationDetails.token,
            enabledAt: Date.now()
          };

          // Store by FID for easy lookup
          await redis.hset('notification_tokens', {
            [fid]: JSON.stringify(tokenData)
          });

          console.log(`✅ Notification token stored for FID ${fid}`);

          return NextResponse.json({
            success: true,
            message: 'Notification token stored',
            fid
          });
        }
        break;

      case 'notifications_disabled':
        // Remove the notification token when user disables
        await redis.hdel('notification_tokens', fid);
        console.log(`🔕 Notification token removed for FID ${fid}`);

        return NextResponse.json({
          success: true,
          message: 'Notification token removed',
          fid
        });

      case 'miniapp_added':
        // Track that user added the app
        console.log(`➕ Mini app added by FID ${fid}`);
        return NextResponse.json({ success: true });

      case 'miniapp_removed':
        // Clean up when user removes the app
        await redis.hdel('notification_tokens', fid);
        console.log(`➖ Mini app removed by FID ${fid}`);

        return NextResponse.json({
          success: true,
          message: 'User data cleaned up',
          fid
        });

      default:
        console.warn(`⚠️ Unknown event type: ${event}`);
        return NextResponse.json({
          success: true,
          message: 'Event received but not processed'
        });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check webhook status and view stored tokens (for debugging)
 */
export async function GET() {
  try {
    const tokens = await redis.hgetall('notification_tokens');
    const count = tokens ? Object.keys(tokens).length : 0;

    return NextResponse.json({
      success: true,
      message: 'Webhook endpoint is active',
      tokensStored: count,
      // Don't expose actual tokens in production
      fids: tokens ? Object.keys(tokens) : []
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}
