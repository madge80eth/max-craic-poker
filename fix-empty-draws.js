const { Redis } = require('@upstash/redis');
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

(async () => {
  console.log('Finding and fixing empty or undefined lastThreeDrawIds...\n');
  const keys = await redis.keys('user:0x*');
  
  let fixed = 0;
  for (const key of keys) {
    if (key.includes(':daily:') || key.includes(':tickets')) continue;
    
    try {
      const data = await redis.hgetall(key);
      if (data) {
        const val = data.lastThreeDrawIds;
        // Fix if empty, null, undefined, or not set
        if (!val || val === '' || val === 'undefined' || val === 'null') {
          console.log('Fixing:', key.slice(0, 60), '- value was:', val);
          await redis.hset(key, { lastThreeDrawIds: '[]' });
          fixed++;
        }
      }
    } catch (err) {}
  }
  
  console.log('\n✅ Fixed', fixed, 'empty/undefined entries');
})();
