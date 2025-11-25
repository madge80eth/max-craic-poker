# Farcaster Mini App Notifications Setup

This app uses Farcaster's native Mini App notification system to send push notifications to users via Warpcast.

## How It Works

1. **User Enables Notifications**: When a user enables notifications in Warpcast for your Mini App, Warpcast sends a webhook to your server with a unique notification token
2. **Token Storage**: Your server stores this token in Redis
3. **Sending Notifications**: When the draw happens, your server sends notifications by POSTing to Warpcast's notification URL with the stored tokens

## Architecture

### Files

- **public/farcaster.json** - Manifest file that tells Farcaster where to send webhooks
- **app/api/webhook/route.ts** - Receives notification tokens from Warpcast
- **app/api/send-notification/route.ts** - Sends notifications using stored tokens
- **app/api/draw/route.ts** - Automatically triggers notifications when draw happens

### Data Flow

```
User enables notifications in Warpcast
    ↓
Warpcast sends webhook to /api/webhook
    ↓
Webhook stores token in Redis (key: notification_tokens)
    ↓
Draw happens → /api/draw executes
    ↓
Draw calls /api/send-notification
    ↓
Send-notification fetches all tokens from Redis
    ↓
POSTs to Warpcast notification URL with tokens
    ↓
Users receive push notification in Warpcast
```

## Configuration

### 1. Farcaster Manifest (Already Done)

The `public/farcaster.json` file is already configured:

```json
{
  "miniapp": {
    "webhookUrl": "https://max-craic-poker.vercel.app/api/webhook"
  }
}
```

### 2. No Environment Variables Needed!

Unlike the previous implementation, this **does not require** any Farcaster API keys or Mini App IDs. The notification system works entirely through webhooks and tokens provided by Warpcast.

## Testing Notifications

### 1. Enable Notifications in Warpcast

Users must:
1. Open your Mini App in Warpcast
2. Go to Mini App settings
3. Enable notifications

This will trigger a webhook to `/api/webhook` with their notification token.

### 2. Check Stored Tokens

Visit: `https://max-craic-poker.vercel.app/api/webhook`

Returns:
```json
{
  "success": true,
  "message": "Webhook endpoint is active",
  "tokensStored": 5,
  "fids": ["12345", "67890", ...]
}
```

### 3. Test Sending Notification

```bash
curl -X POST https://max-craic-poker.vercel.app/api/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "message": "This is a test from Max Craic Poker!",
    "targetUrl": "https://max-craic-poker.vercel.app/mini-app/draw"
  }'
```

### 4. Automatic Draw Notifications

When `/api/draw` is called (30 mins before stream), it automatically:
- Fetches stream time from tournaments data
- Sends notification: "🎰 Draw is Live! Winners announced! Check if you won & tune in at HH:MM"
- All users who enabled notifications receive it

## Rate Limits

Per Farcaster specification:
- **1 notification per 30 seconds per token**
- **100 notifications per day per token**

The system sends to max 100 tokens per request (Farcaster limit).

## Notification Format

Following Farcaster Mini App guidelines:
- **Title**: Max 32 characters
- **Body**: Max 128 characters
- **Target URL**: Max 1024 characters, must be on your domain
- **Notification ID**: Max 128 characters, used for deduplication

## Webhook Events

Your server handles these webhook events:

| Event | Description | Action |
|-------|-------------|--------|
| `notifications_enabled` | User enables notifications | Store token in Redis |
| `notifications_disabled` | User disables notifications | Remove token from Redis |
| `miniapp_added` | User adds your app | Log event |
| `miniapp_removed` | User removes your app | Remove token from Redis |

## Debugging

### Check webhook logs

```bash
# View Vercel function logs
vercel logs --follow
```

### Verify webhook is accessible

```bash
curl https://max-craic-poker.vercel.app/api/webhook
```

Should return token count and list of FIDs.

### Common Issues

1. **No tokens stored**
   - Users haven't enabled notifications yet
   - Webhook URL not accessible
   - Check Vercel logs for webhook errors

2. **Notifications not sending**
   - Check Redis for stored tokens
   - Verify notification URL format
   - Check Warpcast for rate limiting

## Resources

- [Farcaster Mini Apps Notification Guide](https://miniapps.farcaster.xyz/docs/guides/notifications)
- [Farcaster Documentation](https://docs.farcaster.xyz/)
