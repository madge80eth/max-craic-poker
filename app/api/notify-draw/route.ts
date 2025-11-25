import { NextRequest, NextResponse } from 'next/server';

/**
 * Trigger draw notification to all users who have saved the Mini App
 * Should be called when winners are announced (30 mins before stream)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { streamTime } = body;

    // Validate stream time
    if (!streamTime) {
      return NextResponse.json(
        { success: false, message: 'Stream time is required' },
        { status: 400 }
      );
    }

    // Format stream time for display
    const streamDate = new Date(streamTime);
    const formattedTime = streamDate.toLocaleString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Send notification to all users (no targetFid = broadcast)
    // Per Base guidelines:
    // - Title: max 32 chars, short clear statement
    // - Body: max 128 chars, supporting detail or CTA
    const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: '🎰 Draw is Live!',
        body: `Winners announced! Check if you won and tune in at ${formattedTime}`,
        actionUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/mini-app/draw`
      })
    });

    if (!notificationResponse.ok) {
      const errorText = await notificationResponse.text();
      console.error('Failed to send notification:', errorText);
      return NextResponse.json(
        { success: false, message: 'Failed to send notification' },
        { status: notificationResponse.status }
      );
    }

    const result = await notificationResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Draw notification sent successfully',
      data: result
    });

  } catch (error) {
    console.error('Notify draw error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}
