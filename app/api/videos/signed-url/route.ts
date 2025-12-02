// app/api/videos/signed-url/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getMembership } from '@/lib/revenue-redis';
import { getVideo } from '@/lib/video-redis';

export const dynamic = 'force-dynamic';

/**
 * Generate Cloudflare Stream signed URL for video playback
 *
 * Cloudflare Stream signed URLs allow you to restrict video access with expiring tokens.
 * This prevents direct video URL sharing and enforces membership validation.
 *
 * Setup Required:
 * 1. Enable signed URLs in Cloudflare Stream dashboard for each video
 * 2. Get signing key ID and private key (RSA PEM format)
 * 3. Add to environment variables:
 *    - CLOUDFLARE_STREAM_SIGNING_KEY_ID
 *    - CLOUDFLARE_STREAM_SIGNING_KEY (base64 encoded PEM)
 *
 * Docs: https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, walletAddress } = body;

    if (!videoId || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: videoId, walletAddress' },
        { status: 400 }
      );
    }

    // Get video details
    const video = await getVideo(videoId);
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Check if video requires membership
    if (video.membersOnly) {
      const membership = await getMembership(walletAddress.toLowerCase());
      const isMemberActive = membership?.status === 'active' && membership.expiryDate > Date.now();

      if (!isMemberActive) {
        return NextResponse.json(
          { error: 'Active membership required to view this video' },
          { status: 403 }
        );
      }
    }

    // Check if Cloudflare credentials are configured
    const keyId = process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID;
    const keyPem = process.env.CLOUDFLARE_STREAM_SIGNING_KEY;

    if (!keyId || !keyPem) {
      // Fallback to public URL if signed URLs not configured
      console.warn('Cloudflare signed URLs not configured - falling back to public URL');
      return NextResponse.json({
        success: true,
        url: `https://customer-{code}.cloudflarestream.com/${video.cloudflareVideoId}/manifest/video.m3u8`,
        signed: false,
        expiresAt: null
      });
    }

    // Generate signed URL
    const signedUrl = await generateCloudflareSignedUrl(
      video.cloudflareVideoId,
      keyId,
      keyPem,
      3600 // 1 hour expiry
    );

    return NextResponse.json({
      success: true,
      url: signedUrl.url,
      signed: true,
      expiresAt: signedUrl.expiresAt
    });

  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate signed URL', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Generate Cloudflare Stream signed URL using JWT
 *
 * Cloudflare expects a JWT with specific claims:
 * - kid: Key ID from dashboard
 * - exp: Expiration timestamp
 * - nbf: Not before timestamp (optional)
 * - sub: Video ID
 *
 * @param videoId - Cloudflare Stream video ID
 * @param keyId - Signing key ID from Cloudflare dashboard
 * @param keyPem - RSA private key in PEM format (base64 encoded)
 * @param expirySeconds - How long the URL should be valid (default 3600 = 1 hour)
 */
async function generateCloudflareSignedUrl(
  videoId: string,
  keyId: string,
  keyPem: string,
  expirySeconds: number = 3600
): Promise<{ url: string; expiresAt: number }> {
  // Decode PEM key from base64
  const pemKey = Buffer.from(keyPem, 'base64').toString('utf-8');

  // Calculate timestamps
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expirySeconds;

  // Create JWT header
  const header = {
    alg: 'RS256',
    kid: keyId
  };

  // Create JWT payload
  const payload = {
    sub: videoId,
    kid: keyId,
    exp: exp,
    nbf: now - 60, // Allow 60 second clock skew
    accessRules: [
      {
        type: 'ip.geoip.country',
        action: 'allow',
        country: ['*'] // Allow all countries
      }
    ]
  };

  // Use Web Crypto API (available in Edge runtime)
  const token = await signJWT(header, payload, pemKey);

  // Construct signed URL
  const signedUrl = `https://customer-{code}.cloudflarestream.com/${videoId}/manifest/video.m3u8?token=${token}`;

  return {
    url: signedUrl,
    expiresAt: exp * 1000 // Return milliseconds
  };
}

/**
 * Sign JWT using RS256 algorithm
 * Uses Web Crypto API (available in Next.js Edge runtime)
 */
async function signJWT(
  header: Record<string, any>,
  payload: Record<string, any>,
  privateKeyPem: string
): Promise<string> {
  // Base64URL encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const message = `${encodedHeader}.${encodedPayload}`;

  // Import RSA private key
  const pemContents = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );

  // Sign the message
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    data
  );

  // Encode signature
  const encodedSignature = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );

  return `${message}.${encodedSignature}`;
}

/**
 * Base64URL encode (RFC 4648)
 */
function base64UrlEncode(str: string): string {
  const base64 = typeof Buffer !== 'undefined'
    ? Buffer.from(str).toString('base64')
    : btoa(str);

  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
