const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function getRealEntries() {
  console.log('🔍 Looking for real user entries...\n');

  try {
    // Skip entry_history - wrong type

    // Check individual entry keys
    const entryKeys = await redis.keys('entry:*');
    console.log('\n📋 Found entry keys:', entryKeys);

    if (entryKeys.length > 0) {
      console.log('\n🎯 Getting entry data:\n');
      for (const key of entryKeys.slice(0, 10)) { // First 10
        try {
          const data = await redis.hgetall(key);
          console.log(`${key}:`, data);
        } catch (e) {
          console.log(`${key}: ERROR - ${e.message}`);
        }
      }
    }

    // Check user keys for stats
    const allUserKeys = await redis.keys('user:0x*');
    const userKeys = allUserKeys.filter(k => !k.includes(':daily:') && !k.includes(':tickets') && !k.includes(':draw:'));
    console.log(`\n👥 Found ${userKeys.length} user addresses in Redis`);

    // Get users with entries
    const usersWithEntries = [];
    for (const key of userKeys) {
      try {
        const data = await redis.hgetall(key);
        if (data && data.totalEntries && parseInt(data.totalEntries) > 0) {
          const address = key.replace('user:', '');
          usersWithEntries.push({
            address,
            totalEntries: parseInt(data.totalEntries || 0),
            tournamentsAssigned: parseInt(data.tournamentsAssigned || 0)
          });
        }
      } catch (e) {
        // Skip invalid keys
      }
    }

    console.log('\n✅ Users with entries:', usersWithEntries.length);
    if (usersWithEntries.length > 0) {
      console.log(JSON.stringify(usersWithEntries.slice(0, 30), null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

getRealEntries();
