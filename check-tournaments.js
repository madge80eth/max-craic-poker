const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function checkTournaments() {
  try {
    console.log('🔍 Checking tournaments data...\n');
    
    // Check old key
    const oldData = await redis.get('tournaments_data');
    console.log('OLD KEY (tournaments_data):');
    console.log(JSON.stringify(oldData, null, 2));
    console.log('\n---\n');
    
    // Check new key
    const newData = await redis.get('creator:max-craic-poker:tournaments_data');
    console.log('NEW KEY (creator:max-craic-poker:tournaments_data):');
    console.log(JSON.stringify(newData, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTournaments();
