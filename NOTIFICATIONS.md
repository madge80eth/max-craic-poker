# Farcaster Push Notifications Setup

This app uses Farcaster's notification API to send push notifications to users who have saved the Mini App.

## Required Environment Variables

Add these to your `.env.local` file and Vercel environment variables:

```bash
# Farcaster API credentials
FARCASTER_API_KEY=your_farcaster_api_key_here
MINI_APP_ID=your_mini_app_id_here

# Already configured
NEXT_PUBLIC_BASE_URL=https://max-craic-poker.vercel.app
```

## Getting Farcaster API Credentials

1. **Get API Key**: Visit [Farcaster Developer Portal](https://developers.farcaster.xyz/) and create an API key
2. **Get Mini App ID**: This is provided when you register your Mini App with Farcaster

## How It Works

### Automatic Notifications

When the draw is executed (winners are selected 30 mins before stream), the system automatically:

1. Sends a push notification to **all users who have saved the Mini App**
2. Notification appears in their Warpcast/Base app
3. Tapping the notification opens the draw page to see results

### Notification Content

Following Base Mini App guidelines:
- **Title**: "🎰 Draw is Live!" (max 32 chars)
- **Body**: "Winners announced! Check if you won and tune in at HH:MM" (max 128 chars)
- **Action**: Opens `/mini-app/draw` page

### Rate Limits

- 1 notification every 30 seconds (enforced by app)
- 100 notifications per day maximum (enforced by app)
- Complies with Farcaster API limits

## Testing

To test notifications locally:

```bash
# Test the notification endpoint
curl -X POST http://localhost:3000/api/notification \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "body": "This is a test notification"
  }'
```

## User Opt-In

Users automatically receive notifications when they:
1. Save your Mini App to their Warpcast/Base app
2. Grant notification permissions

**No additional opt-in required** - saving the app = opting into notifications

## References

- [Base Notification Guidelines](https://docs.base.org/mini-apps/featured-guidelines/notification-guidelines)
- [OnchainKit useNotification Hook](https://docs.base.org/onchainkit/latest/components/minikit/hooks/useNotification)
