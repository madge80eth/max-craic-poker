const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function checkAllKeys() {
  try {
    console.log('🔍 Checking ALL tournament-related keys:\n');
    
    const keys = [
      'tournaments_data',
      'creator:max-craic-poker:tournaments_data',
      'session_id',
      'current_session_id',
      'creator:max-craic-poker:current_session_id'
    ];
    
    for (const key of keys) {
      const data = await redis.get(key);
      console.log(`KEY: ${key}`);
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log('EMPTY/NULL');
      }
      console.log('\n---\n');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAllKeys();
