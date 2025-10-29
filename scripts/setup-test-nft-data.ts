/**
 * Setup Test NFT Data Script
 *
 * This script creates leaderboard snapshots for testing the NFT claiming feature.
 * It will snapshot the current top 5 wallets for both the current month and previous month.
 *
 * Usage:
 *   npm install tsx --save-dev
 *   npx tsx scripts/setup-test-nft-data.ts
 *
 * Or using the admin API:
 *   POST /api/leaderboard/snapshot
 *   Body: { adminKey: "h3j29fk18u", month: "2025-10" }
 */

const ADMIN_KEY = process.env.ADMIN_RESET_KEY || 'h3j29fk18u';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function createSnapshot(month: string) {
  console.log(`\n📸 Creating snapshot for ${month}...`);

  try {
    const response = await fetch(`${BASE_URL}/api/leaderboard/snapshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        adminKey: ADMIN_KEY,
        month: month,
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Snapshot created successfully!`);
      console.log(`\nTop 5 wallets for ${month}:`);
      data.snapshot.topWallets.forEach((wallet: any) => {
        console.log(`  ${wallet.rank}. ${wallet.walletAddress} - ${wallet.totalEntries} entries`);
      });
      return data.snapshot;
    } else {
      console.error(`❌ Failed to create snapshot: ${data.error}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error creating snapshot:`, error);
    return null;
  }
}

async function checkEligibility(walletAddress: string) {
  console.log(`\n🔍 Checking NFT eligibility for ${walletAddress}...`);

  try {
    const response = await fetch(
      `${BASE_URL}/api/nft/eligibility?wallet=${walletAddress}`
    );

    const data = await response.json();

    if (data.success) {
      console.log(`\n📊 Eligibility Results:`);
      console.log(`  Eligible: ${data.eligible ? 'Yes' : 'No'}`);
      console.log(`  Total eligible claims: ${data.totalEligible}`);
      console.log(`  Total claimable now: ${data.totalClaimable}`);

      if (data.eligibleClaims && data.eligibleClaims.length > 0) {
        console.log(`\n  Eligible Claims:`);
        data.eligibleClaims.forEach((claim: any) => {
          console.log(`    - ${claim.month}: Rank #${claim.rank} (${claim.claimed ? 'Claimed' : 'Not Claimed'})`);
          if (!claim.claimed && claim.withinWindow) {
            console.log(`      → Can claim until ${claim.claimDeadline}`);
          }
        });
      }

      return data;
    } else {
      console.error(`❌ Failed to check eligibility: ${data.error}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error checking eligibility:`, error);
    return null;
  }
}

async function getCurrentMonth(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

async function getPreviousMonth(): Promise<string> {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

async function main() {
  console.log('🚀 Setting up test NFT data...\n');
  console.log(`Base URL: ${BASE_URL}`);

  // Get current and previous months
  const currentMonth = await getCurrentMonth();
  const previousMonth = await getPreviousMonth();

  console.log(`\n📅 Current Month: ${currentMonth}`);
  console.log(`📅 Previous Month: ${previousMonth}`);

  // Create snapshots
  console.log('\n' + '='.repeat(60));
  console.log('Creating snapshots...');
  console.log('='.repeat(60));

  const currentSnapshot = await createSnapshot(currentMonth);
  const previousSnapshot = await createSnapshot(previousMonth);

  if (!currentSnapshot && !previousSnapshot) {
    console.log('\n⚠️  No snapshots were created. Make sure:');
    console.log('  1. The server is running');
    console.log('  2. There are entries in the leaderboard');
    console.log('  3. The admin key is correct');
    return;
  }

  // Check eligibility for top wallets
  console.log('\n' + '='.repeat(60));
  console.log('Checking eligibility for top wallets...');
  console.log('='.repeat(60));

  const walletsToCheck = new Set<string>();

  if (currentSnapshot?.topWallets) {
    currentSnapshot.topWallets.forEach((w: any) => walletsToCheck.add(w.walletAddress));
  }

  if (previousSnapshot?.topWallets) {
    previousSnapshot.topWallets.forEach((w: any) => walletsToCheck.add(w.walletAddress));
  }

  for (const wallet of walletsToCheck) {
    await checkEligibility(wallet);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Setup complete!');
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('  1. Visit the mini-app and connect one of the eligible wallets');
  console.log('  2. Navigate to the Leaderboard tab');
  console.log('  3. You should see the "Claim Your NFT Rewards" section');
  console.log('  4. Click "Claim NFT" to test the claiming flow');
  console.log('\nNote: The actual NFT minting requires deploying the smart contract first.');
}

// Run the script
main().catch(console.error);
