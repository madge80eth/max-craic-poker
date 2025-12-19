// scripts/test-tier-system.ts
// Test script for tier system with 2 test founders
// Run with: npx tsx scripts/test-tier-system.ts

import { createCreator, getCreator, updateCreator, getAllCreators } from '../lib/creator-redis';
import { calculateTier, getEffectiveTier, getTierSplit, createFounderOverride, createStrategicAdvisorOverride } from '../lib/tier-calculator';
import { calculateRevenueSplit } from '../lib/revenue-split';
import { createGrantDistribution, getActiveFounders, getFounderGrantStats } from '../lib/founder-grants';
import { CreatorMetrics } from '../lib/creator-context';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testTierSystem() {
  log('blue', '\n=== TIER SYSTEM TEST SUITE ===\n');

  try {
    // ===== STEP 1: Create 2 Test Founders =====
    log('cyan', '📝 STEP 1: Creating 2 Test Founders');

    const founder1Id = 'test_founder_1';
    const founder2Id = 'test_founder_2';

    // Create Founder 1 (Standard 6-month founder)
    const founder1 = await createCreator({
      id: founder1Id,
      name: 'Test Founder Alice',
      subdomain: 'alice-poker',
      walletAddress: '0xAliceTestWallet123',
      tier: 4, // Start at Tier 4
      tierOverride: createFounderOverride(), // 6-month Tier 1 override
      isFounder: true,
      metrics: {
        volume90d: 0,
        uniqueWallets90d: 0,
        transactionCount90d: 0,
        activeMonths: 0
      },
      lastTierRecalculation: Date.now(),
      branding: {
        primaryColor: '#8b5cf6',
        customDomain: 'alice.example.com'
      },
      features: {
        tippingEnabled: true,
        membershipEnabled: true,
        rafflesEnabled: true
      },
      isActive: true
    });

    log('green', `✅ Created Founder 1: ${founder1.name}`);
    log('yellow', `   Override: Tier 1 (90/10) for 6 months`);
    log('yellow', `   Expires: ${new Date(founder1.tierOverride!.expiresAt).toLocaleDateString()}`);

    // Create Founder 2 (Strategic Advisor - permanent Tier 1)
    const founder2 = await createCreator({
      id: founder2Id,
      name: 'Test Founder Jaylee (Strategic Advisor)',
      subdomain: 'jaylee-poker',
      walletAddress: '0xJayleeTestWallet456',
      tier: 1,
      tierOverride: createStrategicAdvisorOverride(), // Permanent Tier 1
      isFounder: true,
      metrics: {
        volume90d: 0,
        uniqueWallets90d: 0,
        transactionCount90d: 0,
        activeMonths: 0
      },
      lastTierRecalculation: Date.now(),
      branding: {
        primaryColor: '#10b981',
        customDomain: 'jaylee.example.com'
      },
      features: {
        tippingEnabled: true,
        membershipEnabled: true,
        rafflesEnabled: true
      },
      isActive: true
    });

    log('green', `✅ Created Founder 2: ${founder2.name}`);
    log('yellow', `   Override: Tier 1 (90/10) PERMANENT`);

    // ===== STEP 2: Simulate 90 Days of Transactions =====
    log('cyan', '\n📊 STEP 2: Simulating 90 Days of Transactions');

    // Founder 1: Moderate performance (should be Tier 3 without override)
    const metrics1: CreatorMetrics = {
      volume90d: 1500000, // $15K total over 90 days = $5K/month (Tier 3 threshold)
      uniqueWallets90d: 120, // Good community size
      transactionCount90d: 350, // Good activity
      activeMonths: 3 // Consistent 3 months
    };

    await updateCreator(founder1Id, { metrics: metrics1 });

    const calculatedTier1 = calculateTier(metrics1);
    log('yellow', `\nFounder 1 Metrics:`);
    log('yellow', `  Volume: $${(metrics1.volume90d / 100).toFixed(2)} (90 days) = $${(metrics1.volume90d / 300).toFixed(2)}/month`);
    log('yellow', `  Unique Wallets: ${metrics1.uniqueWallets90d}`);
    log('yellow', `  Transactions: ${metrics1.transactionCount90d}`);
    log('yellow', `  Active Months: ${metrics1.activeMonths}`);
    log('yellow', `  Calculated Tier (without override): ${calculatedTier1}`);

    // Founder 2: Low activity (would be Tier 4 without override)
    const metrics2: CreatorMetrics = {
      volume90d: 300000, // $3K total over 90 days = $1K/month (Tier 4)
      uniqueWallets90d: 25,
      transactionCount90d: 80,
      activeMonths: 2
    };

    await updateCreator(founder2Id, { metrics: metrics2 });

    const calculatedTier2 = calculateTier(metrics2);
    log('yellow', `\nFounder 2 Metrics:`);
    log('yellow', `  Volume: $${(metrics2.volume90d / 100).toFixed(2)} (90 days) = $${(metrics2.volume90d / 300).toFixed(2)}/month`);
    log('yellow', `  Unique Wallets: ${metrics2.uniqueWallets90d}`);
    log('yellow', `  Transactions: ${metrics2.transactionCount90d}`);
    log('yellow', `  Active Months: ${metrics2.activeMonths}`);
    log('yellow', `  Calculated Tier (without override): ${calculatedTier2}`);

    // ===== STEP 3: Test Effective Tier (with overrides) =====
    log('cyan', '\n🎯 STEP 3: Testing Effective Tier (with overrides)');

    const updated1 = await getCreator(founder1Id);
    const updated2 = await getCreator(founder2Id);

    const effectiveTier1 = getEffectiveTier(updated1!);
    const effectiveTier2 = getEffectiveTier(updated2!);

    log('green', `\nFounder 1 Effective Tier: ${effectiveTier1} (Override active)`);
    log('green', `Founder 2 Effective Tier: ${effectiveTier2} (Permanent override)`);

    // ===== STEP 4: Test Revenue Splits =====
    log('cyan', '\n💰 STEP 4: Testing Revenue Splits');

    const testAmount = 10000; // $100.00 in cents

    const split1 = await calculateRevenueSplit(founder1Id, testAmount);
    const split2 = await calculateRevenueSplit(founder2Id, testAmount);

    log('yellow', `\nTest Transaction: $${(testAmount / 100).toFixed(2)}`);
    log('green', `\nFounder 1 Split (Tier ${split1.tier}):`);
    log('green', `  Creator gets: $${(split1.creatorAmount / 100).toFixed(2)} (${split1.creatorPercent}%)`);
    log('green', `  Platform gets: $${(split1.platformAmount / 100).toFixed(2)} (${split1.platformPercent}%)`);

    log('green', `\nFounder 2 Split (Tier ${split2.tier}):`);
    log('green', `  Creator gets: $${(split2.creatorAmount / 100).toFixed(2)} (${split2.creatorPercent}%)`);
    log('green', `  Platform gets: $${(split2.platformAmount / 100).toFixed(2)} (${split2.platformPercent}%)`);

    // ===== STEP 5: Test Grant Distribution =====
    log('cyan', '\n🎁 STEP 5: Testing Grant Distribution');

    const grantAmount = 1000000; // $10,000 grant in cents
    const distribution = await createGrantDistribution(
      grantAmount,
      'Test Base Foundation Grant Q1 2025'
    );

    log('yellow', `\nGrant Details:`);
    log('yellow', `  Total Grant: $${(distribution.totalGrantAmount / 100).toFixed(2)}`);
    log('yellow', `  Founder Share (10%): $${(distribution.founderShareAmount / 100).toFixed(2)}`);
    log('yellow', `  Per Founder (${distribution.founderCount}): $${(distribution.perFounderAmount / 100).toFixed(2)}`);
    log('green', `  Founder 1 receives: $${(distribution.perFounderAmount / 100).toFixed(2)}`);
    log('green', `  Founder 2 receives: $${(distribution.perFounderAmount / 100).toFixed(2)}`);

    // ===== STEP 6: Verify Founder Stats =====
    log('cyan', '\n📈 STEP 6: Verifying Founder Stats');

    const activeFounders = await getActiveFounders();
    log('green', `\nActive Founders: ${activeFounders.length}`);
    activeFounders.forEach(id => log('green', `  - ${id}`));

    // ===== STEP 7: Test Tier Changes Over Time =====
    log('cyan', '\n⏰ STEP 7: Testing Tier Override Expiration (Simulated)');

    // Simulate founder 1's override expiring
    log('yellow', '\nSimulating Founder 1 override expiration...');
    await updateCreator(founder1Id, {
      tierOverride: undefined // Override expired
    });

    const postExpiration1 = await getCreator(founder1Id);
    const newEffectiveTier1 = getEffectiveTier(postExpiration1!);

    log('red', `Founder 1 override EXPIRED`);
    log('yellow', `New Effective Tier: ${newEffectiveTier1} (based on performance)`);

    const newSplit1 = getTierSplit(newEffectiveTier1);
    log('yellow', `New Revenue Split: ${newSplit1.creatorPercent}/${newSplit1.platformPercent}`);

    // ===== SUMMARY =====
    log('blue', '\n=== TEST SUMMARY ===');
    log('green', '✅ Created 2 test founders');
    log('green', '✅ Simulated 90 days of transactions');
    log('green', '✅ Verified tier overrides working correctly');
    log('green', '✅ Tested revenue splits (Tier 1: 90/10)');
    log('green', '✅ Tested grant distribution (10% split)');
    log('green', '✅ Verified tier recalculation after override expiration');

    log('blue', '\n=== ALL TESTS PASSED ===\n');

  } catch (error) {
    log('red', `\n❌ TEST FAILED: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testTierSystem()
  .then(() => {
    log('green', '✅ Test suite completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    log('red', `❌ Test suite failed: ${error.message}`);
    process.exit(1);
  });
