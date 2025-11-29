const { Redis } = require('@upstash/redis');
// Load env vars if dotenv is available
try { require('dotenv').config(); } catch {}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function emergencyDraw() {
  console.log('🚨 EMERGENCY DRAW STARTING...\n');

  try {
    // Get all entries from Redis
    const entries = await redis.hgetall('raffle_entries');

    if (!entries || Object.keys(entries).length === 0) {
      console.error('❌ No entries found in Redis!');
      process.exit(1);
    }

    // Convert entries to array
    const entryArray = [];
    for (const [address, data] of Object.entries(entries)) {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        entryArray.push({
          walletAddress: address,
          ...parsed
        });
      } catch (err) {
        console.error(`⚠️  Skipping corrupted entry for ${address}`);
      }
    }

    console.log(`📊 Total entries found: ${entryArray.length}\n`);

    if (entryArray.length < 6) {
      console.error(`❌ Need at least 6 entries. Only have ${entryArray.length}`);
      process.exit(1);
    }

    // Randomly shuffle and pick 6 unique winners
    const shuffled = [...entryArray].sort(() => Math.random() - 0.5);
    const uniqueWinners = Array.from(new Set(shuffled.map(e => e.walletAddress)))
      .slice(0, 6)
      .map(address => shuffled.find(e => e.walletAddress === address));

    console.log('🎰 WINNERS SELECTED:\n');
    console.log('═══════════════════════════════════════════════\n');

    const positions = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
    const prizePercents = [6, 5, 4.5, 4, 3.5, 3];

    uniqueWinners.forEach((winner, idx) => {
      console.log(`🏆 ${positions[idx]} Place (${prizePercents[idx]}%)`);
      console.log(`   Wallet: ${winner.walletAddress}`);
      console.log(`   Tournament: ${winner.tournament || 'N/A'}`);
      console.log(`   Has Shared: ${winner.hasShared ? 'Yes (+2% bonus)' : 'No'}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════');
    console.log('✅ Emergency draw complete!\n');

    // Return the winners for further processing
    return uniqueWinners;

  } catch (error) {
    console.error('❌ Emergency draw failed:', error);
    process.exit(1);
  }
}

// Run the draw
emergencyDraw();
