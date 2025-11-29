import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { checkAndResetSession } from '@/lib/session';
import { checkAndResetMonthly } from '@/lib/monthly-reset';
import { updateUserStats, useAllTickets, getUserTickets } from '@/lib/redis';
import { getMembershipSettings, getMembership } from '@/lib/revenue-redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface EntryRequest {
  walletAddress: string;
  platform: 'farcaster' | 'base';
}

export async function POST(request: NextRequest) {
  try {
    const body: EntryRequest = await request.json();
    const { walletAddress, platform } = body;

    if (!walletAddress) {
      return NextResponse.json({
        success: false,
        error: 'Wallet address required'
      }, { status: 400 });
    }

    // Auto-reset if session changed in tournaments.json
    await checkAndResetSession();

    // Auto-check and reset monthly leaderboard if new month
    await checkAndResetMonthly();

    // Check membership requirement (if enabled)
    const membershipSettings = await getMembershipSettings();
    if (membershipSettings.requireMembershipForRaffle) {
      const membership = await getMembership(walletAddress.toLowerCase());
      const isMember = membership?.status === 'active' && membership.expiryDate > Date.now();

      if (!isMember) {
        return NextResponse.json({
          success: false,
          error: 'Membership required to enter raffle. Please subscribe in the Info tab.',
          requiresMembership: true
        }, { status: 403 });
      }
    }

    // Block entries if winners already drawn
    const winnersData = await redis.get('raffle_winners');
    if (winnersData) {
      return NextResponse.json({
        success: false,
        error: 'Draw has already been completed. Cannot enter after winners are selected.'
      }, { status: 400 });
    }

    // Check if already entered
    const existingEntry = await redis.hget('raffle_entries', walletAddress);
    if (existingEntry) {
      const entry = typeof existingEntry === 'string'
        ? JSON.parse(existingEntry)
        : existingEntry;

      return NextResponse.json({
        success: true,
        message: 'Already entered!',
        alreadyEntered: true,
        entry
      });
    }

    // Get user's accumulated tickets and use them all
    const ticketsToUse = await useAllTickets(walletAddress);

    // Ensure at least 1 entry even if no tickets accumulated
    const entryCount = Math.max(ticketsToUse, 1);

    // Create new entry with ticket count
    const entry = {
      walletAddress,
      platform,
      timestamp: Date.now(),
      hasShared: false,  // Track if user shared for bonus calculation
      ticketCount: entryCount  // Number of raffle entries this user has
    };

    // Store entry in current draw pool
    await redis.hset('raffle_entries', { [walletAddress]: JSON.stringify(entry) });

    console.log(`🎫 ${walletAddress} entered draw with ${entryCount} tickets`);

    // Update persistent entry history (never cleared by reset)
    const historyKey = 'entry_history';
    const existingHistory = await redis.hget(historyKey, walletAddress);

    let historyData;
    if (existingHistory) {
      const parsed = typeof existingHistory === 'string' ? JSON.parse(existingHistory) : existingHistory;
      historyData = {
        totalEntries: parsed.totalEntries + 1,
        lastEntry: new Date().toISOString(),
        firstEntry: parsed.firstEntry,
        sessions: [...(parsed.sessions || []), new Date().toISOString()]
      };
    } else {
      historyData = {
        totalEntries: 1,
        lastEntry: new Date().toISOString(),
        firstEntry: new Date().toISOString(),
        sessions: [new Date().toISOString()]
      };
    }

    await redis.hset(historyKey, { [walletAddress]: JSON.stringify(historyData) });

    // Get total entries count for current draw
    const totalEntries = await redis.hlen('raffle_entries');

    // Get sessionId from tournaments.json for consistent draw tracking
    const tournamentsPath = require('path').join(process.cwd(), 'public', 'tournaments.json');
    const tournamentsFile = require('fs').readFileSync(tournamentsPath, 'utf-8');
    const tournamentsData = JSON.parse(tournamentsFile);
    const drawId = tournamentsData.sessionId || `draw-${Date.now()}`;

    // Update user stats for streak tracking
    await updateUserStats(walletAddress, drawId);

    return NextResponse.json({
      success: true,
      message: `Successfully entered with ${entryCount} ticket${entryCount !== 1 ? 's' : ''}!`,
      entry,
      totalEntries,
      ticketsUsed: entryCount
    });

  } catch (error) {
    console.error('Entry error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: String(error)
    }, { status: 500 });
  }
}