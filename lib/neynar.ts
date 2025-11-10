/**
 * Neynar API helper functions for Farcaster verification
 * Docs: https://docs.neynar.com/reference
 */

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY!;
const NEYNAR_BASE_URL = 'https://api.neynar.com/v2';

interface NeynarCast {
  hash: string;
  author: {
    fid: number;
    username: string;
    verified_addresses: {
      eth_addresses: string[];
    };
  };
  text: string;
  embeds: Array<{ url?: string }>;
  timestamp: string;
}

/**
 * Search for recent casts by a user that contain specific text/URL
 */
export async function searchUserCasts(
  fid: number,
  searchText: string,
  limit: number = 25
): Promise<NeynarCast[]> {
  try {
    const url = `${NEYNAR_BASE_URL}/farcaster/casts?fid=${fid}&limit=${limit}`;

    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'api_key': NEYNAR_API_KEY,
      },
    });

    if (!response.ok) {
      console.error('Neynar API error:', response.status, await response.text());
      return [];
    }

    const data = await response.json();
    const casts: NeynarCast[] = data.casts || [];

    // Filter casts that contain the search text (case insensitive)
    return casts.filter(cast => {
      const textMatch = cast.text.toLowerCase().includes(searchText.toLowerCase());
      const embedMatch = cast.embeds?.some(embed =>
        embed.url?.toLowerCase().includes(searchText.toLowerCase())
      );
      return textMatch || embedMatch;
    });
  } catch (error) {
    console.error('Neynar search error:', error);
    return [];
  }
}

/**
 * Get user info by FID (Farcaster ID)
 */
export async function getUserByFid(fid: number) {
  try {
    const url = `${NEYNAR_BASE_URL}/farcaster/user/bulk?fids=${fid}`;

    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'api_key': NEYNAR_API_KEY,
      },
    });

    if (!response.ok) {
      console.error('Neynar API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.users?.[0] || null;
  } catch (error) {
    console.error('Neynar getUserByFid error:', error);
    return null;
  }
}

/**
 * Verify if a wallet address has shared content containing specific URL
 * Returns true if user has posted/recast with the URL in last 24 hours
 */
export async function verifyWalletShared(
  walletAddress: string,
  searchUrl: string = 'max-craic-poker.vercel.app'
): Promise<boolean> {
  try {
    // First, get user by wallet address
    const userUrl = `${NEYNAR_BASE_URL}/farcaster/user/bulk-by-address?addresses=${walletAddress}`;

    const userResponse = await fetch(userUrl, {
      headers: {
        'accept': 'application/json',
        'api_key': NEYNAR_API_KEY,
      },
    });

    if (!userResponse.ok) {
      console.error('Neynar user lookup failed:', userResponse.status);
      return false;
    }

    const userData = await userResponse.json();
    const users = Object.values(userData)[0] as any[];

    if (!users || users.length === 0) {
      console.log('No Farcaster user found for wallet:', walletAddress);
      return false;
    }

    const fid = users[0].fid;
    console.log(`Found FID ${fid} for wallet ${walletAddress}`);

    // Search their recent casts for our URL
    const recentCasts = await searchUserCasts(fid, searchUrl, 25);

    // Check if any casts are from last 24 hours
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentShares = recentCasts.filter(cast => {
      const castTime = new Date(cast.timestamp).getTime();
      return castTime > oneDayAgo;
    });

    if (recentShares.length > 0) {
      console.log(`✅ Verified: Wallet ${walletAddress} shared in last 24h`);
      return true;
    }

    console.log(`❌ No recent shares found for wallet ${walletAddress}`);
    return false;

  } catch (error) {
    console.error('Neynar verification error:', error);
    return false;
  }
}
