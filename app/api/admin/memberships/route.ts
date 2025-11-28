// app/api/admin/memberships/route.ts
import { NextResponse } from 'next/server';
import { getAllMemberships } from '@/lib/revenue-redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const memberships = await getAllMemberships();

    return NextResponse.json({
      success: true,
      memberships
    });
  } catch (error) {
    console.error('Error fetching memberships:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memberships' },
      { status: 500 }
    );
  }
}
