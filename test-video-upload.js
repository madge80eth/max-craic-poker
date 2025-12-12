// Test video upload with isShort field
const testShortVideo = {
  cloudflareVideoId: "test-short-abc123",
  title: "Amazing River Bluff - Short",
  description: "Quick highlight of an incredible river bluff in a high stakes game",
  category: "highlight",
  duration: 45,
  thumbnailUrl: "",
  membersOnly: false,
  isShort: true
};

const testMainVideo = {
  cloudflareVideoId: "test-main-xyz789",
  title: "Full Hand Breakdown: AA vs KK All-In",
  description: "Detailed analysis of a monster pot with pocket aces versus pocket kings",
  category: "breakdown",
  duration: 420,
  thumbnailUrl: "",
  membersOnly: true,
  isShort: false
};

console.log("Testing Short Video Upload:");
console.log(JSON.stringify(testShortVideo, null, 2));
console.log("\nTesting Main Video Upload:");
console.log(JSON.stringify(testMainVideo, null, 2));

// Test with curl commands
console.log("\n\n=== CURL COMMANDS TO TEST ===\n");
console.log("1. Upload Short Video (Free):");
console.log(`curl -X POST https://max-craic-poker-6yzur1ldz-maxcraics-projects.vercel.app/api/admin/videos \
  -H "Content-Type: application/json" \
  -d '${JSON.stringify(testShortVideo)}'`);

console.log("\n2. Upload Main Video (Members):");
console.log(`curl -X POST https://max-craic-poker-6yzur1ldz-maxcraics-projects.vercel.app/api/admin/videos \
  -H "Content-Type: application/json" \
  -d '${JSON.stringify(testMainVideo)}'`);
