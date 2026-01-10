// app/api/admin/giveaway-settings/route.ts
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

interface GiveawaySettings {
  membersOnly: boolean;
}

export async function GET() {
  try {
    const data = await redis.hgetall('giveaway_settings');

    if (!data || Object.keys(data).length === 0) {
      // Default settings
      return NextResponse.json({
        success: true,
        settings: {
          membersOnly: false
        }
      });
    }

    const settings: GiveawaySettings = {
      membersOnly: data.membersOnly === 'true'
    };

    return NextResponse.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching giveaway settings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch giveaway settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { membersOnly } = body;

    // Validation
    if (typeof membersOnly !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'Invalid membersOnly value' },
        { status: 400 }
      );
    }

    // Save settings
    await redis.hset('giveaway_settings', {
      membersOnly: membersOnly ? 'true' : 'false'
    });

    return NextResponse.json({
      success: true,
      message: 'Giveaway settings updated successfully'
    });
  } catch (error) {
    console.error('Error saving giveaway settings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save giveaway settings' },
      { status: 500 }
    );
  }
}
