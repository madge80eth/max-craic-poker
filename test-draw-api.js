const { Redis } = require('@upstash/redis');
const fs = require('fs');
const path = require('path');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Simulate the draw endpoint logic
async function simulateDraw() {
  console.log('🎲 Simulating Draw Endpoint Logic\n');

  try {
    // Step 1: Get entries
    console.log('1. Fetching entries...');
    const entries = await redis.hgetall('raffle_entries');

    if (!entries || Object.keys(entries).length === 0) {
      throw new Error('No entries found');
    }

    console.log(`   ✅ Found ${Object.keys(entries).length} entries`);

    // Step 2: Parse entries
    console.log('\n2. Parsing entries...');
    const entryArray = [];
    for (const [address, data] of Object.entries(entries)) {
      try {
        if (typeof data === 'string' && !data.startsWith('{')) {
          console.log(`   ⚠️  Skipping non-JSON: ${address.slice(0, 8)}...`);
          continue;
        }
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        entryArray.push({
          walletAddress: address,
          ...parsed
        });
      } catch (parseErr) {
        console.error(`   ❌ Parse error for ${address}:`, parseErr.message);
      }
    }

    console.log(`   ✅ Parsed ${entryArray.length} valid entries`);

    if (entryArray.length < 6) {
      throw new Error(`Need at least 6 entries. Currently have ${entryArray.length}`);
    }

    // Step 3: Load tournaments
    console.log('\n3. Loading tournaments...');
    let tournamentsData = await redis.get('tournaments_data');

    if (!tournamentsData) {
      console.log('   ℹ️  No tournaments in Redis, loading from file...');
      const filePath = path.join(process.cwd(), 'public', 'tournaments.json');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      tournamentsData = JSON.parse(fileContent);
    } else {
      tournamentsData = typeof tournamentsData === 'string' ? JSON.parse(tournamentsData) : tournamentsData;
    }

    if (!tournamentsData || !tournamentsData.tournaments) {
      throw new Error('No tournaments data available');
    }

    const tournaments = tournamentsData.tournaments;
    console.log(`   ✅ Found ${tournaments.length} tournaments`);

    if (!Array.isArray(tournaments) || tournaments.length === 0) {
      throw new Error('No tournaments available');
    }

    // Step 4: Select winners
    console.log('\n4. Selecting winners...');
    const shuffled = [...entryArray].sort(() => Math.random() - 0.5);
    const uniqueWinners = Array.from(new Set(shuffled.map(e => e.walletAddress)))
      .slice(0, 6)
      .map(address => shuffled.find(e => e.walletAddress === address));

    console.log(`   ✅ Selected ${uniqueWinners.length} unique winners`);

    // Step 5: Prize structure
    console.log('\n5. Calculating prizes...');
    const prizeStructure = [
      { position: 1, basePercent: 6 },
      { position: 2, basePercent: 5 },
      { position: 3, basePercent: 4.5 },
      { position: 4, basePercent: 4 },
      { position: 5, basePercent: 3.5 },
      { position: 6, basePercent: 3 }
    ];

    const shuffledTournaments = [...tournaments].sort(() => Math.random() - 0.5);

    const winners = [];
    for (let idx = 0; idx < uniqueWinners.length; idx++) {
      const entry = uniqueWinners[idx];

      // Get user stats
      const statsData = await redis.hgetall(`user:${entry.walletAddress}`);
      const currentStreak = parseInt(statsData?.currentStreak || '0');

      const hasShared = entry.hasShared || false;
      const hasStreak = currentStreak === 3;

      const basePercent = prizeStructure[idx].basePercent;
      const sharingBonus = hasShared ? 2 : 0;
      const baseWithBonus = basePercent + sharingBonus;
      const streakMultiplier = hasStreak ? 1.5 : 1;
      const finalPercent = baseWithBonus * streakMultiplier;

      const winner = {
        walletAddress: entry.walletAddress,
        position: prizeStructure[idx].position,
        assignedTournament: shuffledTournaments[idx]?.name || 'TBD',
        basePercentage: basePercent,
        sharingBonus,
        streakMultiplier,
        finalPercentage: finalPercent,
        tournamentResult: 'pending',
        payout: 0
      };

      winners.push(winner);
      console.log(`   🎉 Winner ${idx + 1}: ${entry.walletAddress.slice(0, 8)}... - ${winner.assignedTournament} (${finalPercent}%)`);
    }

    console.log('\n✅ Draw simulation successful!');
    console.log('\n📊 Results:');
    console.log(JSON.stringify({ success: true, winners, totalEntries: entryArray.length }, null, 2));

  } catch (error) {
    console.error('\n❌ Draw simulation failed!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

simulateDraw();
