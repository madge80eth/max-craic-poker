// app/api/admin/membership-settings/route.ts
import { NextResponse } from 'next/server';
import { getMembershipSettings, saveMembershipSettings } from '@/lib/revenue-redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getMembershipSettings();
    return NextResponse.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching membership settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch membership settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { enabled, monthlyFeeUSDC, benefits } = body;

    // Validation
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid enabled value' },
        { status: 400 }
      );
    }

    if (typeof monthlyFeeUSDC !== 'number' || monthlyFeeUSDC < 0) {
      return NextResponse.json(
        { error: 'Invalid monthly fee' },
        { status: 400 }
      );
    }

    if (!Array.isArray(benefits)) {
      return NextResponse.json(
        { error: 'Benefits must be an array' },
        { status: 400 }
      );
    }

    // Save settings
    await saveMembershipSettings({
      enabled,
      monthlyFeeUSDC,
      benefits
    });

    return NextResponse.json({
      success: true,
      message: 'Membership settings updated successfully'
    });
  } catch (error) {
    console.error('Error saving membership settings:', error);
    return NextResponse.json(
      { error: 'Failed to save membership settings' },
      { status: 500 }
    );
  }
}
