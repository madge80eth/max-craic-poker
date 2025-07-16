const fs = require('fs');
const path = require('path');

// Bring in recast checker and castHash
const { checkIfRecasted } = require('./checkRecast');
const frameSession = require('./frame-session.json');

// Load all entries
const entriesPath = path.join(__dirname, 'entries.json');
const raw = fs.readFileSync(entriesPath, 'utf-8');
const entries = JSON.parse(raw);

// Guard: No entries
if (!entries.length) {
  console.error('❌ No entries found. Aborting draw.');
  process.exit(1);
}

// Randomly pick ONE winner
const winner = entries[Math.floor(Math.random() * entries.length)];
const winnerFID = parseInt(winner.fid.replace('fid_', ''), 10); // clean FID for Neynar check

// Async wrapper for top-level await
async function runDraw() {
  const recasted = await checkIfRecasted(winnerFID, frameSession.castHash);
  const prizePercent = recasted ? 0.10 : 0.05;

  const result = {
    winnerFID: winner.fid,
    tournament: winner.tournament,
    recasted,
    prizePercent,
    timestamp: new Date().toISOString(),
  };

  // Save draw result
  const drawPath = path.join(__dirname, 'draw.json');
  fs.writeFileSync(drawPath, JSON.stringify(result, null, 2));

  console.log('✅ Single winner drawn:');
  console.log(`🏆 FID: ${winner.fid}`);
  console.log(`🎯 Tournament: ${winner.tournament}`);
  console.log(`🔁 Recasted? ${recasted}`);
  console.log(`💰 Prize: ${prizePercent * 100}%`);
}

runDraw();
