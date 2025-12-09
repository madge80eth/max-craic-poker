const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function checkRedisData() {
  console.log('🔍 Checking Redis Data\n');

  // Check raffle_winners
  console.log('1. Checking raffle_winners...');
  const raffleWinners = await redis.get('raffle_winners');
  console.log('   Type:', typeof raffleWinners);
  console.log('   Value:', raffleWinners);

  // Check current_draw_result
  console.log('\n2. Checking current_draw_result...');
  const currentDraw = await redis.get('current_draw_result');
  console.log('   Type:', typeof currentDraw);
  console.log('   Value:', currentDraw);

  // Check tournaments_data
  console.log('\n3. Checking tournaments_data...');
  const tournamentsData = await redis.get('tournaments_data');
  console.log('   Type:', typeof tournamentsData);
  if (tournamentsData) {
    try {
      const parsed = typeof tournamentsData === 'string' ? JSON.parse(tournamentsData) : tournamentsData;
      console.log('   Parsed:', JSON.stringify(parsed, null, 2));
    } catch (err) {
      console.log('   Parse error:', err.message);
    }
  }

  // Clean up corrupted data
  console.log('\n4. Cleaning up any corrupted draw data...');
  if (typeof raffleWinners === 'string' && !raffleWinners.startsWith('{')) {
    console.log('   ⚠️  Corrupted raffle_winners detected, deleting...');
    await redis.del('raffle_winners');
    console.log('   ✅ Deleted corrupted raffle_winners');
  }

  if (typeof currentDraw === 'string' && !currentDraw.startsWith('{')) {
    console.log('   ⚠️  Corrupted current_draw_result detected, deleting...');
    await redis.del('current_draw_result');
    console.log('   ✅ Deleted corrupted current_draw_result');
  }

  console.log('\n✅ Redis data check complete');
}

checkRedisData();
