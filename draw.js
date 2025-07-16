const fs = require('fs');
const path = require('path');

// Load all entries
const entriesPath = path.join(__dirname, 'entries.json');
const raw = fs.readFileSync(entriesPath, 'utf-8');
const entries = JSON.parse(raw);

// Randomly pick ONE winner from all entries
const winner = entries[Math.floor(Math.random() * entries.length)];

const result = {
  winnerFID: winner.fid,
  tournament: winner.tournament,
  timestamp: new Date().toISOString(),
};

// Save draw result
const drawPath = path.join(__dirname, 'draw.json');
fs.writeFileSync(drawPath, JSON.stringify(result, null, 2));

console.log('✅ Single winner drawn:');
console.log(result);
