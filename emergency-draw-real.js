const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function emergencyDrawReal() {
  console.log('🚨 EMERGENCY DRAW - REAL USERS\n');

  try {
    // Get all user keys
    const allUserKeys = await redis.keys('user:0x*');
    const userKeys = allUserKeys.filter(k => !k.includes(':daily:') && !k.includes(':tickets') && !k.includes(':draw:'));

    // Get users with entries
    const usersWithEntries = [];
    for (const key of userKeys) {
      try {
        const data = await redis.hgetall(key);
        if (data && data.totalEntries && parseInt(data.totalEntries) > 0) {
          const address = key.replace('user:', '');
          usersWithEntries.push({
            walletAddress: address,
            totalEntries: parseInt(data.totalEntries || 0),
            tournamentsAssigned: parseInt(data.tournamentsAssigned || 0),
            currentStreak: parseInt(data.currentStreak || 0)
          });
        }
      } catch (e) {
        // Skip invalid keys
      }
    }

    console.log(`📊 Total users with entries: ${usersWithEntries.length}\n`);

    if (usersWithEntries.length < 6) {
      console.error(`❌ Need at least 6 users. Only have ${usersWithEntries.length}`);
      process.exit(1);
    }

    // Randomly shuffle and pick 6 unique winners
    const shuffled = [...usersWithEntries].sort(() => Math.random() - 0.5);
    const winners = shuffled.slice(0, 6);

    // Get tournaments
    const tournamentsData = await redis.get('tournaments_data');
    const tournaments = tournamentsData?.tournaments || [];

    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('🎰 WINNERS SELECTED FROM REAL USERS:\n');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const positions = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
    const prizePercents = [6, 5, 4.5, 4, 3.5, 3];

    winners.forEach((winner, idx) => {
      const tournament = tournaments[idx]?.name || 'TBD';
      console.log(`🏆 ${positions[idx]} Place (${prizePercents[idx]}%)`);
      console.log(`   Wallet: ${winner.walletAddress}`);
      console.log(`   Tournament: ${tournament}`);
      console.log(`   Total Entries: ${winner.totalEntries}`);
      console.log(`   Streak: ${winner.currentStreak === 3 ? 'Yes (1.5x multiplier!)' : 'No'}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Emergency draw complete!\n');

    return winners;

  } catch (error) {
    console.error('❌ Emergency draw failed:', error);
    process.exit(1);
  }
}

emergencyDrawReal();
