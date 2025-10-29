# 🏆 NFT Coaching Voucher System

## 🎯 What Is This?

An NFT reward system that gives the **top 5 leaderboard performers** each month a coaching voucher NFT worth **one free hour with Max Craic**!

---

## 🚀 Quick Start (3 Commands)

```bash
# 1. Install dependencies
npm install tsx --save-dev

# 2. Setup test data
npm run nft:setup

# 3. Open browser and test
# Visit http://localhost:3000/mini-app
# Connect with a top 5 wallet
# Go to Leaderboard tab
```

---

## 📦 What Was Built

### Smart Contract
- ✅ `contracts/LeaderboardNFT.sol` - ERC-721 NFT contract

### Backend APIs (4 endpoints)
- ✅ `/api/leaderboard/snapshot` - Create monthly snapshots
- ✅ `/api/nft/eligibility` - Check claim eligibility
- ✅ `/api/nft/claim` - Claim NFTs
- ✅ `/api/nft/metadata/:wallet/:month` - NFT metadata

### Frontend
- ✅ Claim button in Leaderboard tab
- ✅ Eligibility checking
- ✅ Status display (Claimed, Available, Expired)

### Scripts
- ✅ `npm run nft:setup` - Create test snapshots
- ✅ `npm run nft:test` - Run API tests
- ✅ `npm run nft:snapshot` - Quick snapshot creation

### Documentation
- ✅ `QUICKSTART_NFT.md` - Quick reference
- ✅ `docs/NFT_FEATURE.md` - Complete docs
- ✅ `NFT_IMPLEMENTATION_SUMMARY.md` - Full summary

---

## 🎮 How to Test

### Method 1: Automated Setup (Recommended)
```bash
npm run nft:setup
```

This will:
- Create snapshots for current and previous months
- Show top 5 wallets
- Display eligibility for testing

### Method 2: Manual API Calls
```bash
# Create snapshot
curl -X POST http://localhost:3000/api/leaderboard/snapshot \
  -H "Content-Type: application/json" \
  -d '{"adminKey":"h3j29fk18u"}'

# Check eligibility
curl "http://localhost:3000/api/nft/eligibility?wallet=0xYOUR_WALLET"
```

### Method 3: Run Full Test Suite
```bash
npm run nft:test
```

---

## 🎨 What Users See

When a top 5 wallet views the Leaderboard tab:

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🎁 Claim Your NFT Rewards                 ┃
┃                                            ┃
┃ Top 5 finishers can claim a coaching      ┃
┃ voucher NFT - one free hour with Max!     ┃
┃                                            ┃
┃ ┌────────────────────────────────────────┐┃
┃ │ 🥇 Rank #1 - October 2024             │┃
┃ │ Claim by November 30, 2024  [Claim NFT]│┃
┃ └────────────────────────────────────────┘┃
┃                                            ┃
┃ ┌────────────────────────────────────────┐┃
┃ │ 🥈 Rank #2 - September 2024           │┃
┃ │ ✓ Claimed                               │┃
┃ └────────────────────────────────────────┘┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## 📊 How It Works

```
Month End
   │
   ├──> Snapshot Created (Top 5 saved)
   │
   ├──> Claim Window Opens
   │        │
   │        ├──> Winners see claim button
   │        ├──> Click to claim
   │        ├──> NFT minted (production)
   │        └──> NFT appears in wallet
   │
   └──> Following Month End (Window closes)
```

---

## 🗂️ File Structure

```
mcp-frame-clean/
├── contracts/
│   ├── LeaderboardNFT.sol          ← Smart contract
│   └── deploy.js                   ← Deployment helper
│
├── app/api/
│   ├── leaderboard/snapshot/       ← Snapshot API
│   ├── nft/eligibility/            ← Eligibility API
│   ├── nft/claim/                  ← Claim API
│   └── nft/metadata/[wallet]/[month]/ ← Metadata API
│
├── app/mini-app/
│   └── page.tsx                    ← Frontend (updated)
│
├── lib/
│   └── nft.ts                      ← NFT utilities
│
├── scripts/
│   ├── setup-test-nft-data.ts      ← Test setup (npm run nft:setup)
│   ├── test-nft-api.sh             ← API tests (npm run nft:test)
│   └── create-snapshot.sh          ← Quick snapshot (npm run nft:snapshot)
│
├── docs/
│   └── NFT_FEATURE.md              ← Complete documentation
│
├── QUICKSTART_NFT.md               ← Quick reference
├── NFT_IMPLEMENTATION_SUMMARY.md   ← Full summary
└── README_NFT.md                   ← This file
```

---

## 🎯 Testing Checklist

- [ ] Run `npm run nft:setup`
- [ ] See "Snapshot created successfully" messages
- [ ] Open `http://localhost:3000/mini-app`
- [ ] Connect wallet from top 5
- [ ] Navigate to Leaderboard tab
- [ ] See "Claim Your NFT Rewards" section
- [ ] Click "Claim NFT" button
- [ ] See success message
- [ ] Status updates to "Claimed ✓"

---

## 🔧 NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run nft:setup` | Create test snapshots (recommended) |
| `npm run nft:test` | Run full API test suite |
| `npm run nft:snapshot` | Quick snapshot creation |

---

## 🌐 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/leaderboard/snapshot` | POST | Create snapshot |
| `/api/leaderboard/snapshot?month=X` | GET | Get snapshot |
| `/api/nft/eligibility?wallet=X` | GET | Check eligibility |
| `/api/nft/claim` | POST | Claim NFT |
| `/api/nft/claim?wallet=X` | GET | Check claim status |
| `/api/nft/metadata/:wallet/:month` | GET | Get NFT metadata |

---

## 🚨 Common Issues

### ❌ "No eligible claims"
**Fix**: Run `npm run nft:setup` to create snapshots

### ❌ Claim button not showing
**Fix**:
1. Ensure connected wallet is in top 5
2. Check snapshots exist: `curl http://localhost:3000/api/leaderboard/snapshot`
3. Verify eligibility: `curl "http://localhost:3000/api/nft/eligibility?wallet=0xYOUR_WALLET"`

### ❌ "Claim window expired"
**Fix**: Create snapshot for current/previous month (not older)

---

## 🎉 Current Status

### ✅ Complete and Ready for Testing
- Smart contract written
- All APIs implemented
- Frontend UI working
- Test scripts ready
- Documentation complete

### 🔜 Production Next Steps
1. Deploy smart contract to Base
2. Add contract address to `.env`
3. Update frontend to call contract for minting
4. Set up automated monthly snapshots

---

## 📚 Documentation

- **Quick Start**: [QUICKSTART_NFT.md](QUICKSTART_NFT.md)
- **Full Docs**: [docs/NFT_FEATURE.md](docs/NFT_FEATURE.md)
- **Complete Summary**: [NFT_IMPLEMENTATION_SUMMARY.md](NFT_IMPLEMENTATION_SUMMARY.md)
- **This Guide**: [README_NFT.md](README_NFT.md)

---

## 🎓 Learn More

### Smart Contract
- Location: [contracts/LeaderboardNFT.sol](contracts/LeaderboardNFT.sol)
- Standard: ERC-721 (OpenZeppelin)
- Features: Minting, burning, metadata, claim tracking

### Frontend Code
- Location: [app/mini-app/page.tsx](app/mini-app/page.tsx)
- Search for: "NFT Claims Section"
- Shows: Eligibility checking, claim button, status display

### Backend Logic
- Snapshots: [app/api/leaderboard/snapshot/route.ts](app/api/leaderboard/snapshot/route.ts)
- Eligibility: [app/api/nft/eligibility/route.ts](app/api/nft/eligibility/route.ts)
- Claims: [app/api/nft/claim/route.ts](app/api/nft/claim/route.ts)

---

## 💡 Key Features

### For Users
- 🏆 Top 5 monthly performers get rewarded
- ⏰ Claim window until end of following month
- 🎨 Rank-specific NFTs (Champion, Runner-up, etc.)
- 🎓 One free hour of coaching per NFT
- 📱 Simple one-click claiming

### For Admins
- 📸 Easy snapshot creation
- 🔍 Eligibility tracking
- 🛡️ Double-claim prevention
- 📊 Complete claim history
- 🔧 Flexible configuration

---

## 🔐 Security

- ✅ Admin key required for snapshots
- ✅ Wallet verification before claiming
- ✅ Claim window enforced server-side
- ✅ Double-claim prevention
- ✅ Owner-only minting on contract

---

## 🎨 NFT Metadata Example

```json
{
  "name": "Max Craic Coaching Voucher - Champion",
  "description": "🥇 Congratulations! You ranked #1 on the Max Craic Poker leaderboard for October 2024. This NFT entitles you to one free hour of poker coaching.",
  "image": "https://max-craic-poker.vercel.app/nft/1.png",
  "attributes": [
    { "trait_type": "Rank", "value": 1 },
    { "trait_type": "Month", "value": "October 2024" },
    { "trait_type": "Type", "value": "Coaching Voucher" },
    { "trait_type": "Duration", "value": "1 Hour" },
    { "trait_type": "Tier", "value": "Champion" }
  ]
}
```

---

## 🎮 Try It Now!

```bash
# 1. Setup
npm install tsx --save-dev

# 2. Create test data
npm run nft:setup

# 3. Open and test
# Visit: http://localhost:3000/mini-app
# Connect: Top 5 wallet
# Navigate: Leaderboard tab
# Action: Click "Claim NFT"
```

---

## 📞 Need Help?

Check these in order:

1. **Quick answers**: [QUICKSTART_NFT.md](QUICKSTART_NFT.md)
2. **Complete guide**: [docs/NFT_FEATURE.md](docs/NFT_FEATURE.md)
3. **Full details**: [NFT_IMPLEMENTATION_SUMMARY.md](NFT_IMPLEMENTATION_SUMMARY.md)
4. **Browser console**: Look for errors
5. **API tests**: Run `npm run nft:test`

---

**Status**: ✅ Ready to test locally | 🔜 Smart contract deployment needed for production

Built with ❤️ for Max Craic Poker Community
