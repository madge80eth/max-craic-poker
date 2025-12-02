# Cloudflare Stream Signed URLs Setup Guide

## Overview

This system uses Cloudflare Stream signed URLs to secure video content. Signed URLs prevent unauthorized access by requiring time-limited tokens that validate membership status.

## Why Signed URLs?

**Without Signed URLs:**
- Videos are publicly accessible via direct Cloudflare URLs
- Anyone with the video ID can watch members-only content
- No true content gating

**With Signed URLs:**
- Videos require cryptographically signed tokens to play
- Tokens expire after 1 hour (configurable)
- Membership status validated before token generation
- Direct video URLs won't work without valid token

## Setup Steps

### 1. Enable Signed URLs in Cloudflare Dashboard

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Stream** → **Signing Keys**
3. Click **Create Signing Key**
4. Download the following:
   - **Key ID** (looks like: `a1b2c3d4e5f6g7h8`)
   - **Private Key** (PEM format - keep this secret!)

### 2. Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Cloudflare Stream Signed URLs
CLOUDFLARE_STREAM_SIGNING_KEY_ID=your_key_id_here
CLOUDFLARE_STREAM_SIGNING_KEY=base64_encoded_pem_key_here
```

**Converting PEM to Base64:**

Your private key file looks like this:
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----
```

Convert it to base64:
```bash
# On macOS/Linux
cat private-key.pem | base64

# On Windows (PowerShell)
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("private-key.pem"))
```

Copy the entire base64 string (all on one line) and use it as `CLOUDFLARE_STREAM_SIGNING_KEY`.

### 3. Enable Signed URLs for Each Video

For each video uploaded to Cloudflare Stream:

1. Go to **Stream** → **Videos**
2. Click on the video
3. Go to **Security** tab
4. Toggle **Require signed URLs** to ON

### 4. Deploy Environment Variables

Add the environment variables to your Vercel project:

```bash
# Using Vercel CLI
vercel env add CLOUDFLARE_STREAM_SIGNING_KEY_ID
vercel env add CLOUDFLARE_STREAM_SIGNING_KEY

# Or via Vercel Dashboard
# Settings → Environment Variables → Add Variable
```

## How It Works

### Flow

1. User visits video page
2. Client requests signed URL from `/api/videos/signed-url`
3. Server validates:
   - Video exists
   - If video is members-only → check membership status
4. If authorized:
   - Generate JWT token signed with RSA private key
   - Return signed URL with 1-hour expiry
5. Client loads video using signed URL
6. Cloudflare validates token before streaming

### Token Structure

```javascript
{
  "sub": "cloudflare_video_id",
  "kid": "your_key_id",
  "exp": 1234567890, // Unix timestamp
  "nbf": 1234567830, // Not before (60s clock skew)
  "accessRules": [
    {
      "type": "ip.geoip.country",
      "action": "allow",
      "country": ["*"]
    }
  ]
}
```

### Security Features

- **Time-limited tokens**: 1 hour expiry (customizable)
- **Membership validation**: Checked before token generation
- **RSA-256 signing**: Industry-standard JWT security
- **Clock skew tolerance**: 60 second buffer for time sync issues
- **Automatic fallback**: Public URLs if signing not configured

## Testing

### Test Signed URL Generation

```bash
curl -X POST https://your-domain.com/api/videos/signed-url \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "your_video_id",
    "walletAddress": "0x123..."
  }'
```

**Expected response:**
```json
{
  "success": true,
  "url": "https://customer-{code}.cloudflarestream.com/video_id/manifest/video.m3u8?token=eyJ...",
  "signed": true,
  "expiresAt": 1234567890
}
```

### Verify Token Expiry

Wait 1 hour and try to access the video URL directly - it should fail with 403 Forbidden.

### Test Membership Gating

1. Create a members-only video
2. Try to access without membership → should get 403 error
3. Purchase membership ($10 USDC)
4. Try again → should get signed URL

## Fallback Behavior

If environment variables are NOT configured:

- System falls back to public Cloudflare URLs
- Membership gating still works at the UI level (blur/lock overlay)
- But users could theoretically find direct video URLs
- Console warning logged: "Cloudflare signed URLs not configured"

## Troubleshooting

### Issue: "Failed to generate signed URL"

**Cause**: Invalid private key format

**Fix**:
1. Ensure PEM key includes header/footer lines
2. Convert to base64 correctly (all one line)
3. Check for extra spaces or newlines

### Issue: "Video won't play with signed URL"

**Cause**: Signed URLs not enabled for that video in Cloudflare

**Fix**:
1. Go to video in Cloudflare dashboard
2. Security tab → Enable "Require signed URLs"

### Issue: "Token expired" error

**Cause**: Token lifetime exceeded

**Fix**:
- Tokens auto-refresh every hour
- If user keeps video page open >1 hour, they need to refresh
- Consider implementing auto-refresh logic

## Cost Implications

- Cloudflare Stream pricing: https://www.cloudflare.com/products/cloudflare-stream/pricing/
- Signed URLs: **No additional cost**
- Storage: $5/month per 1,000 minutes
- Delivery: $1 per 1,000 minutes watched

## Production Checklist

- [ ] Created Cloudflare Stream signing key
- [ ] Added environment variables to `.env.local`
- [ ] Deployed environment variables to Vercel
- [ ] Enabled signed URLs for all members-only videos
- [ ] Tested signed URL generation API
- [ ] Verified membership validation works
- [ ] Confirmed token expiry after 1 hour
- [ ] Tested fallback to public URLs (without env vars)

## References

- [Cloudflare Stream Signed URLs Docs](https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/)
- [JWT Standard (RFC 7519)](https://tools.ietf.org/html/rfc7519)
- [RSA Signing Algorithm](https://www.rfc-editor.org/rfc/rfc3447)
