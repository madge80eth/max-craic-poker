const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function saveEmergencyWinners() {
  console.log('💾 Saving emergency winners to Redis...\n');

  try {
    // The 6 winners from the emergency draw
    const winners = [
      {
        walletAddress: '0x807F6B351ECB861BF1eB92d1cBc42187f0be8C5b',
        position: 1,
        assignedTournament: 'PokerStars: Bounty Builder $4.40 $5k Gtd',
        basePercentage: 6,
        sharingBonus: 0,
        streakMultiplier: 1,
        finalPercentage: 6,
        tournamentResult: 'pending',
        payout: 0
      },
      {
        walletAddress: '0x8C4BB608034fE666FeE1eE9a3a3bcB5F28A9a187',
        position: 2,
        assignedTournament: '888: $2,000 Early Mystery Bounty',
        basePercentage: 5,
        sharingBonus: 0,
        streakMultiplier: 1,
        finalPercentage: 5,
        tournamentResult: 'pending',
        payout: 0
      },
      {
        walletAddress: '0x987e48dc498663e9127588a814754A5cc5354c02',
        position: 3,
        assignedTournament: 'PokerStars: 30% Progressive KO $5.50, $500 Gtd',
        basePercentage: 4.5,
        sharingBonus: 0,
        streakMultiplier: 1,
        finalPercentage: 4.5,
        tournamentResult: 'pending',
        payout: 0
      },
      {
        walletAddress: '0x80FAAf4AB1D602D33E7c13B51Bc65E129Ff73440',
        position: 4,
        assignedTournament: 'Betfair: €10 Bounty Hunter Prime 8-Max, €1.5K Gtd',
        basePercentage: 4,
        sharingBonus: 0,
        streakMultiplier: 1,
        finalPercentage: 4,
        tournamentResult: 'pending',
        payout: 0
      },
      {
        walletAddress: '0xBcAa503d49E429E22B3C5eBd53DBF31259db6E15',
        position: 5,
        assignedTournament: 'PokerStars: Progressive KO $750 Gtd',
        basePercentage: 3.5,
        sharingBonus: 0,
        streakMultiplier: 1,
        finalPercentage: 3.5,
        tournamentResult: 'pending',
        payout: 0
      },
      {
        walletAddress: '0x8191B8706a823cccfc88386eC33fffDCe04d35Ba',
        position: 6,
        assignedTournament: 'Betfair: €3 Morning Micro, €400 Gtd',
        basePercentage: 3,
        sharingBonus: 0,
        streakMultiplier: 1,
        finalPercentage: 3,
        tournamentResult: 'pending',
        payout: 0
      }
    ];

    const drawResult = {
      drawId: `draw-${Date.now()}`,
      timestamp: Date.now(),
      winners
    };

    // Save to both keys
    await redis.set('raffle_winners', JSON.stringify(drawResult));
    await redis.set('current_draw_result', JSON.stringify(drawResult));

    // Set draw_time to now (for the 12-hour lock)
    await redis.set('draw_time', Date.now());

    console.log('✅ Winners saved to Redis!');
    console.log(`   Draw ID: ${drawResult.drawId}`);
    console.log(`   Timestamp: ${new Date(drawResult.timestamp).toISOString()}`);
    console.log(`   Draw time set: ${Date.now()}`);
    console.log('\n🔒 12-hour lock activated!\n');

    // Increment tournaments assigned for each winner
    for (const winner of winners) {
      await redis.hincrby(`user:${winner.walletAddress}`, 'tournamentsAssigned', 1);
      console.log(`✓ Updated tournamentsAssigned for ${winner.walletAddress}`);
    }

    console.log('\n✅ All done! Ready for stream!');

  } catch (error) {
    console.error('❌ Failed to save winners:', error);
    process.exit(1);
  }
}

saveEmergencyWinners();
