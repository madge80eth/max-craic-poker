const fs = require('fs');
const path = require('path');
const now = new Date().toISOString();

// Update session.json
const sessionPath = path.join(__dirname, 'session.json');
fs.writeFileSync(sessionPath, JSON.stringify({ sessionStart: now }, null, 2));

// Clear entries.json
const entriesPath = path.join(__dirname, 'entries.json');
fs.writeFileSync(entriesPath, '[]');

console.log(`✅ Session started at ${now}`);
console.log('📤 entries.json cleared.');
