const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function checkData() {
  console.log('🔍 Checking Redis for any data...\n');

  try {
    // Check for winners
    const winners = await redis.get('raffle_winners');
    console.log('raffle_winners:', winners ? JSON.stringify(winners, null, 2) : 'EMPTY');

    // Check for entries
    const entries = await redis.hgetall('raffle_entries');
    console.log('\nraffle_entries:', entries ? JSON.stringify(entries, null, 2) : 'EMPTY');

    // Check for current draw
    const currentDraw = await redis.get('current_draw_result');
    console.log('\ncurrent_draw_result:', currentDraw ? JSON.stringify(currentDraw, null, 2) : 'EMPTY');

    // Scan for all keys
    const keys = await redis.keys('*');
    console.log('\n📋 All Redis keys:', keys);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkData();
