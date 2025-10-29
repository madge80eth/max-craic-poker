# NFT Feature Quick Start Guide

## What Was Built

A complete NFT reward system where **top 5 monthly leaderboard performers** can claim an NFT voucher for **one free hour of poker coaching**.

## Key Features
✅ Monthly leaderboard snapshots
✅ Top 5 eligibility tracking
✅ Claim window (until end of following month)
✅ NFT metadata generation
✅ Frontend claim UI
✅ Test data setup scripts

## Files Created

### Smart Contract
- `contracts/LeaderboardNFT.sol` - ERC-721 NFT contract

### Backend APIs
- `app/api/leaderboard/snapshot/route.ts` - Create/get snapshots
- `app/api/nft/eligibility/route.ts` - Check claim eligibility
- `app/api/nft/claim/route.ts` - Claim NFTs
- `app/api/nft/metadata/[wallet]/[month]/route.ts` - NFT metadata

### Frontend
- `app/mini-app/page.tsx` - Updated with claim UI

### Libraries
- `lib/nft.ts` - NFT utilities and helpers

### Scripts
- `scripts/setup-test-nft-data.ts` - Setup test snapshots
- `scripts/create-snapshot.sh` - Bash script for snapshots

### Documentation
- `docs/NFT_FEATURE.md` - Complete feature documentation

## Testing Locally (3 Steps)

### 1. Start Your Server
```bash
npm run dev
```

### 2. Create Test Snapshots

**Option A: TypeScript (recommended)**
```bash
npm install tsx --save-dev
npx tsx scripts/setup-test-nft-data.ts
```

**Option B: Direct API call**
```bash
curl -X POST http://localhost:3000/api/leaderboard/snapshot \
  -H "Content-Type: application/json" \
  -d '{"adminKey":"h3j29fk18u"}'

# For previous month (to have 2 claimable NFTs)
curl -X POST http://localhost:3000/api/leaderboard/snapshot \
  -H "Content-Type: application/json" \
  -d '{"adminKey":"h3j29fk18u","month":"2024-09"}'
```

### 3. Test in Browser

1. Open `http://localhost:3000/mini-app`
2. Connect with a wallet that's in the top 5 leaderboard
3. Click "Leaderboard" tab
4. Scroll down to see "Claim Your NFT Rewards" section
5. Click "Claim NFT"

## What You'll See

In the Leaderboard tab, eligible wallets will see:

```
🎁 Claim Your NFT Rewards
Top 5 finishers can claim a coaching voucher NFT - one free hour with Max Craic!

┌─────────────────────────────────────────┐
│ 🥇 Rank #1 - 2024-10                   │
│ Claim by November 30, 2024    [Claim NFT]│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🥈 Rank #2 - 2024-09                   │
│ ✓ Claimed                               │
└─────────────────────────────────────────┘
```

## Environment Variables Needed (Production)

Add these to your `.env`:

```bash
# Smart contract addresses (after deployment)
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_TESTNET=0x...

# Already exists
ADMIN_RESET_KEY=h3j29fk18u
```

## Production Deployment Checklist

### 1. Deploy Smart Contract
```bash
# Install OpenZeppelin
cd contracts
npm install @openzeppelin/contracts

# Deploy (you'll need to create a deployment script)
# Update .env with contract address
```

### 2. Update Frontend for Real Minting

The current implementation **records claims** but doesn't mint yet. To enable actual minting, uncomment the smart contract interaction code in [docs/NFT_FEATURE.md](docs/NFT_FEATURE.md#smart-contract-interaction-production).

### 3. Set Up Monthly Snapshots

Create a cron job or use Vercel Cron to automatically snapshot the leaderboard at month-end:

```bash
# Vercel Cron (recommended)
# Add to vercel.json:
{
  "crons": [{
    "path": "/api/leaderboard/snapshot",
    "schedule": "0 0 1 * *"
  }]
}
```

## How to Check if It's Working

### 1. Check if snapshots exist
```bash
curl http://localhost:3000/api/leaderboard/snapshot
```

### 2. Check wallet eligibility
```bash
curl "http://localhost:3000/api/leaderboard/eligibility?wallet=0xYOUR_WALLET"
```

### 3. Check claim status
```bash
curl "http://localhost:3000/api/nft/claim?wallet=0xYOUR_WALLET"
```

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/leaderboard/snapshot` | POST | Create monthly snapshot |
| `/api/leaderboard/snapshot?month=X` | GET | Get snapshot |
| `/api/nft/eligibility?wallet=X` | GET | Check eligibility |
| `/api/nft/claim` | POST | Claim NFT |
| `/api/nft/claim?wallet=X&month=Y` | GET | Check claim status |

## Common Issues

**Problem**: "No eligible claims"
- **Fix**: Run the snapshot script to create test data

**Problem**: Claim button doesn't show
- **Fix**: Ensure you're connected with a top 5 wallet and have created snapshots

**Problem**: "Claim window expired"
- **Fix**: Snapshots are configured with claim deadlines. For testing, create a snapshot for the current or previous month

## Next Steps

1. ✅ Test locally with current leaderboard wallets
2. 🔜 Deploy smart contract to Base
3. 🔜 Update frontend to call contract for minting
4. 🔜 Set up automated monthly snapshots
5. 🔜 Create unique NFT artwork for each rank

## Need Help?

- Full docs: [docs/NFT_FEATURE.md](docs/NFT_FEATURE.md)
- Smart contract: [contracts/LeaderboardNFT.sol](contracts/LeaderboardNFT.sol)
- Frontend code: [app/mini-app/page.tsx](app/mini-app/page.tsx) (search for "NFT Claims Section")

---

**Status**: ✅ Ready for testing
**Next**: Deploy smart contract for actual NFT minting
