const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');

// Load tournament + logo paths
const tournaments = require('./tournaments.json');
const logoPath = path.join(__dirname, 'public/mcp-logo.png');

// Config
const sessionPath = path.join(__dirname, 'session.json');
const entriesPath = path.join(__dirname, 'entries.json');
const outputPath = path.join(__dirname, 'public/frame.png');

// 1. Start a new session
const now = new Date();
fs.writeFileSync(sessionPath, JSON.stringify({ sessionStart: now.toISOString() }, null, 2));

// 2. Clear previous entries
fs.writeFileSync(entriesPath, '[]');

// 3. Generate new frame.png
async function generateImage() {
  const canvas = createCanvas(1200, 630);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText("Today's Tournaments", 280, 100);

  // Load and draw logo
  try {
    const logo = await loadImage(logoPath);
    ctx.drawImage(logo, 60, 60, 180, 180);
  } catch (err) {
    console.warn('⚠️ Failed to load logo:', err.message);
  }

  // Draw tournament list
  ctx.font = '28px sans-serif';
  tournaments.forEach((t, i) => {
    ctx.fillText(`• ${t}`, 280, 160 + i * 40);
  });

  // Countdown
  const deadline = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const diffMs = deadline - new Date();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  ctx.fillStyle = '#ccc';
  ctx.font = '24px sans-serif';
  ctx.fillText(`Draw closes in ${diffH}h ${diffM}m`, 280, 500);

  // Enter button visual
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(280, 540, 160, 50);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('Enter Now', 305, 575);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log('✅ Frame image generated and saved.');
}

generateImage();
