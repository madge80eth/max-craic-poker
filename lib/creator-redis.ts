// Creator management in Redis
import { redis } from './redis';
import { Creator, DEFAULT_CREATOR_ID } from './creator-context';

/**
 * Redis Schema:
 * creators:all → SET of all creator IDs
 * creator:{id}:profile → HASH with creator data
 */

export async function getCreator(creatorId: string): Promise<Creator | null> {
  const data = await redis.hgetall(`creator:${creatorId}:profile`);

  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  return {
    id: creatorId,
    name: data.name as string,
    subdomain: data.subdomain as string,
    walletAddress: data.walletAddress as string,
    platformFeePercentage: parseFloat(data.platformFeePercentage as string),
    branding: JSON.parse(data.branding as string),
    features: JSON.parse(data.features as string),
    createdAt: parseInt(data.createdAt as string),
    isActive: data.isActive === 'true'
  };
}

export async function createCreator(creator: Omit<Creator, 'createdAt'>): Promise<Creator> {
  const fullCreator: Creator = {
    ...creator,
    createdAt: Date.now()
  };

  await redis.hset(`creator:${creator.id}:profile`, {
    name: creator.name,
    subdomain: creator.subdomain,
    walletAddress: creator.walletAddress,
    platformFeePercentage: creator.platformFeePercentage,
    branding: JSON.stringify(creator.branding),
    features: JSON.stringify(creator.features),
    createdAt: fullCreator.createdAt,
    isActive: creator.isActive ? 'true' : 'false'
  });

  // Add to creators set
  await redis.sadd('creators:all', creator.id);

  return fullCreator;
}

export async function updateCreator(creatorId: string, updates: Partial<Creator>): Promise<void> {
  const updateData: Record<string, string | number> = {};

  if (updates.name) updateData.name = updates.name;
  if (updates.subdomain) updateData.subdomain = updates.subdomain;
  if (updates.walletAddress) updateData.walletAddress = updates.walletAddress;
  if (updates.platformFeePercentage !== undefined) updateData.platformFeePercentage = updates.platformFeePercentage;
  if (updates.branding) updateData.branding = JSON.stringify(updates.branding);
  if (updates.features) updateData.features = JSON.stringify(updates.features);
  if (updates.isActive !== undefined) updateData.isActive = updates.isActive ? 'true' : 'false';

  await redis.hset(`creator:${creatorId}:profile`, updateData);
}

export async function getAllCreators(): Promise<Creator[]> {
  const creatorIds = await redis.smembers('creators:all');

  if (!creatorIds || creatorIds.length === 0) {
    return [];
  }

  const creators = await Promise.all(
    (creatorIds as string[]).map(id => getCreator(id))
  );

  return creators.filter((c): c is Creator => c !== null);
}

export async function getCreatorBySubdomain(subdomain: string): Promise<Creator | null> {
  const allCreators = await getAllCreators();
  return allCreators.find(c => c.subdomain === subdomain) || null;
}

/**
 * Initialize default creator if doesn't exist
 */
export async function ensureDefaultCreator(): Promise<void> {
  const existing = await getCreator(DEFAULT_CREATOR_ID);

  if (!existing) {
    await createCreator({
      id: DEFAULT_CREATOR_ID,
      name: 'Max Craic Poker',
      subdomain: 'maxcraicpoker',
      walletAddress: process.env.NEXT_PUBLIC_TIP_WALLET_ADDRESS || '',
      platformFeePercentage: 2,
      branding: {
        primaryColor: '#8b5cf6',
        customDomain: 'maxcraicpoker.com'
      },
      features: {
        tippingEnabled: true,
        membershipEnabled: true,
        rafflesEnabled: true
      },
      isActive: true
    });

    console.log('✅ Default creator initialized:', DEFAULT_CREATOR_ID);
  }
}
