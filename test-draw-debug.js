const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function testDraw() {
  console.log('🔍 Testing Draw Mechanism\n');

  try {
    // Check Redis connection
    console.log('1. Testing Redis connection...');
    const ping = await redis.ping();
    console.log('   ✅ Redis connected:', ping);

    // Check entries
    console.log('\n2. Checking raffle entries...');
    const entries = await redis.hgetall('raffle_entries');
    console.log('   Entries:', entries);
    console.log('   Total entries:', entries ? Object.keys(entries).length : 0);

    if (!entries || Object.keys(entries).length === 0) {
      console.log('\n⚠️  NO ENTRIES FOUND - Adding 10 test wallets...\n');

      // Add 10 test wallets
      const testWallets = [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333',
        '0x4444444444444444444444444444444444444444',
        '0x5555555555555555555555555555555555555555',
        '0x6666666666666666666666666666666666666666',
        '0x7777777777777777777777777777777777777777',
        '0x8888888888888888888888888888888888888888',
        '0x9999999999999999999999999999999999999999',
        '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
      ];

      for (const wallet of testWallets) {
        const entryData = {
          platform: 'web',
          timestamp: Date.now(),
          hasShared: Math.random() > 0.5
        };
        await redis.hset('raffle_entries', { [wallet]: JSON.stringify(entryData) });
        console.log(`   ✅ Added: ${wallet.slice(0, 8)}...`);
      }

      console.log('\n   ✅ Test wallets added successfully!\n');
    }

    // Validate entries can be parsed
    console.log('\n3. Validating entry data...');
    const entriesCheck = await redis.hgetall('raffle_entries');
    let validCount = 0;
    let invalidCount = 0;

    for (const [address, data] of Object.entries(entriesCheck)) {
      try {
        if (typeof data === 'string' && !data.startsWith('{')) {
          console.log(`   ⚠️  Corrupted: ${address.slice(0, 8)}... - ${data}`);
          invalidCount++;
          continue;
        }
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        validCount++;
      } catch (err) {
        console.log(`   ❌ Parse error: ${address.slice(0, 8)}... - ${err.message}`);
        invalidCount++;
      }
    }

    console.log(`   Valid entries: ${validCount}`);
    console.log(`   Invalid entries: ${invalidCount}`);

    if (validCount < 6) {
      console.log(`\n❌ ERROR: Need at least 6 valid entries, only have ${validCount}`);
      return;
    }

    // Check tournaments data
    console.log('\n4. Checking tournaments data...');
    const tournamentsData = await redis.get('tournaments_data');
    if (tournamentsData) {
      const parsed = typeof tournamentsData === 'string' ? JSON.parse(tournamentsData) : tournamentsData;
      console.log('   ✅ Tournaments in Redis:', parsed.tournaments?.length || 0);
    } else {
      console.log('   ⚠️  No tournaments in Redis, will use file fallback');
    }

    console.log('\n✅ All checks passed! Draw should work.\n');
    console.log('Now trigger the draw from admin panel and check for errors.');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
  }
}

testDraw();
