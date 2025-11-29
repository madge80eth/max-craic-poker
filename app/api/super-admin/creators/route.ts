import { NextRequest, NextResponse } from 'next/server';
import { getAllCreators, createCreator as createCreatorInRedis } from '@/lib/creator-redis';

export const dynamic = 'force-dynamic';

// Get all creators
export async function GET() {
  try {
    const creators = await getAllCreators();

    return NextResponse.json({
      success: true,
      creators
    });
  } catch (error) {
    console.error('Error fetching creators:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creators' },
      { status: 500 }
    );
  }
}

// Create new creator
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, subdomain, walletAddress } = body;

    // Validation
    if (!name || !subdomain || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: name, subdomain, walletAddress' },
        { status: 400 }
      );
    }

    // Validate subdomain format
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return NextResponse.json(
        { error: 'Subdomain must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    // Create creator with default settings
    const creatorId = `${subdomain}-poker`;

    const creator = await createCreatorInRedis({
      id: creatorId,
      name,
      subdomain,
      walletAddress,
      platformFeePercentage: 2, // Default 2%
      branding: {},
      features: {
        tippingEnabled: true,
        membershipEnabled: true,
        rafflesEnabled: true
      },
      isActive: true
    });

    console.log(`✅ Creator created: ${creatorId} (${name})`);

    return NextResponse.json({
      success: true,
      creator,
      message: `Creator created! Access at: ${subdomain}.craicprotocol.com`
    });

  } catch (error) {
    console.error('Error creating creator:', error);
    return NextResponse.json(
      { error: 'Failed to create creator', details: String(error) },
      { status: 500 }
    );
  }
}
