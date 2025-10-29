# NFT Coaching Voucher Feature

## Overview

The NFT Coaching Voucher feature rewards the top 5 performers on the monthly leaderboard with an NFT that entitles them to **one free hour of poker coaching** with Max Craic.

## How It Works

### 1. Monthly Leaderboard Snapshots
- At the end of each month, a snapshot is taken of the top 5 wallets on the leaderboard
- Snapshots capture: wallet address, rank (1-5), and total entries
- Snapshots are stored permanently in Redis

### 2. Claim Window
- Winners have until the **end of the following month** to claim their NFT
- Example: October 2025 winners can claim until November 30, 2025
- After the deadline, the claim expires

### 3. NFT Claiming Process
1. Eligible wallets see a "Claim Your NFT Rewards" section in the Leaderboard tab
2. Each eligible month shows:
   - Rank achieved (🥇🥈🥉🏆)
   - Month of achievement
   - Claim deadline
   - Claim status (Claimed, Available, or Expired)
3. Click "Claim NFT" to initiate the claim
4. Backend prepares the claim and generates metadata
5. (In production) Smart contract mints the NFT to the wallet

### 4. NFT Properties
- **Type**: ERC-721 (unique, non-fungible)
- **Name**: Max Craic Coaching Voucher
- **Symbol**: MCCV
- **Metadata**: Includes rank, month, coaching details
- **Burnable**: Can be burned when coaching session is used (future feature)

## Architecture

### Smart Contract
- **File**: `contracts/LeaderboardNFT.sol`
- **Features**:
  - Mints NFTs to winners
  - Tracks claims per wallet per month (prevents double claims)
  - Stores token info (month, rank, used status)
  - Owner-only minting (controlled by backend)

### Backend APIs

#### 1. **Snapshot API** (`/api/leaderboard/snapshot`)
- **POST**: Create a snapshot of current top 5
  - Requires admin key
  - Stores in Redis: `leaderboard_snapshot:{month}`
- **GET**: Retrieve snapshot(s)
  - Query param `month` for specific month
  - Returns all snapshots if no month specified

#### 2. **Eligibility API** (`/api/nft/eligibility`)
- **GET**: Check if wallet is eligible to claim
  - Query param: `wallet` (required)
  - Returns all eligible claims (past and present)
  - Filters claimable vs expired claims

#### 3. **Claim API** (`/api/nft/claim`)
- **POST**: Initiate a claim
  - Body: `{ walletAddress, month }`
  - Validates eligibility and claim window
  - Generates metadata and stores claim record
- **PUT**: Update claim with token ID (after minting)
  - Body: `{ walletAddress, month, tokenId, transactionHash }`
- **GET**: Get claim status
  - Query params: `wallet`, `month` (optional)

#### 4. **Metadata API** (`/api/nft/metadata/[wallet]/[month]`)
- **GET**: Retrieve NFT metadata
- Returns JSON metadata (OpenSea standard)
- Used as tokenURI in smart contract

### Frontend Integration
- **File**: `app/mini-app/page.tsx`
- **Features**:
  - Fetches eligibility when viewing leaderboard
  - Displays claims section for eligible wallets
  - Shows rank, month, deadline, and status
  - "Claim NFT" button triggers claim flow
  - Real-time updates after claiming

### Data Storage (Redis)

```
leaderboard_snapshots (String/Array)
  - List of all snapshot months: ["2025-09", "2025-10", ...]

leaderboard_snapshot:{month} (Hash)
  - month: "2025-10"
  - snapshotDate: ISO timestamp
  - topWallets: [{ walletAddress, rank, totalEntries }, ...]

nft_claims (Hash)
  - Key: "{walletAddress}:{month}"
  - Value: { walletAddress, month, rank, claimedAt, tokenId, metadataUri, transactionHash }

nft_metadata:{wallet}:{month} (String/JSON)
  - NFT metadata JSON
```

## Setup Instructions

### 1. Deploy Smart Contract

```bash
# Install dependencies
cd contracts
npm install @openzeppelin/contracts

# Deploy to Base (update with your wallet/key)
npx hardhat run scripts/deploy-leaderboard-nft.js --network base

# Save contract address to .env
echo "NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x..." >> .env
echo "NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_TESTNET=0x..." >> .env.testnet
```

### 2. Create Test Snapshots

You can create snapshots in multiple ways:

**Option A: Using the TypeScript script**
```bash
npm install tsx --save-dev
npx tsx scripts/setup-test-nft-data.ts
```

**Option B: Using the bash script**
```bash
chmod +x scripts/create-snapshot.sh
./scripts/create-snapshot.sh
```

**Option C: Using curl directly**
```bash
# Current month
curl -X POST http://localhost:3000/api/leaderboard/snapshot \
  -H "Content-Type: application/json" \
  -d '{"adminKey":"h3j29fk18u"}'

# Previous month (for testing)
curl -X POST http://localhost:3000/api/leaderboard/snapshot \
  -H "Content-Type: application/json" \
  -d '{"adminKey":"h3j29fk18u","month":"2025-09"}'
```

### 3. Test NFT Claiming

1. **Check eligibility**:
```bash
curl "http://localhost:3000/api/nft/eligibility?wallet=0x849e78D6C4fB87d152d1Da384c353712E4b1c1C5"
```

2. **Visit the mini-app**:
   - Connect with an eligible wallet
   - Navigate to Leaderboard tab
   - Look for "Claim Your NFT Rewards" section

3. **Claim NFT**:
   - Click "Claim NFT" button
   - Confirm transaction (in production)
   - NFT is minted to your wallet

### 4. Verify Claims

```bash
# Check claim status
curl "http://localhost:3000/api/nft/claim?wallet=0x849e78D6C4fB87d152d1Da384c353712E4b1c1C5"

# Check all snapshots
curl "http://localhost:3000/api/leaderboard/snapshot"

# Check specific month snapshot
curl "http://localhost:3000/api/leaderboard/snapshot?month=2025-10"
```

## Testing with Current Leaderboard

To test with the current leaderboard wallets:

1. **Create snapshots for current and previous months**:
```bash
npx tsx scripts/setup-test-nft-data.ts
```

2. **The script will**:
   - Fetch current leaderboard
   - Create snapshots for top 5 wallets
   - Create snapshots for both current and previous months
   - Display eligibility for each wallet

3. **Connect one of the top 5 wallets**:
   - You'll see up to 2 claimable NFTs (one per month)
   - Click to claim each

## Monthly Automation (Production)

Set up a cron job to automatically snapshot at month end:

```bash
# Add to crontab (runs at 11:59 PM on last day of month)
59 23 28-31 * * [ "$(date -d tomorrow +\%d)" = "01" ] && curl -X POST https://max-craic-poker.vercel.app/api/leaderboard/snapshot -H "Content-Type: application/json" -d '{"adminKey":"YOUR_KEY"}'
```

Or use Vercel Cron (in `vercel.json`):
```json
{
  "crons": [{
    "path": "/api/cron/snapshot",
    "schedule": "59 23 L * *"
  }]
}
```

Then create `/api/cron/snapshot/route.ts`:
```typescript
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Create snapshot
  const month = getCurrentMonth();
  // ... snapshot logic
}
```

## Smart Contract Interaction (Production)

Once deployed, update the claim flow:

```typescript
// In app/mini-app/page.tsx
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { LEADERBOARD_NFT_ABI, getActiveNFTContract } from '@/lib/nft';

const handleClaimNFT = async (month: string, rank: number) => {
  // 1. Prepare claim on backend
  const res = await fetch('/api/nft/claim', {
    method: 'POST',
    body: JSON.stringify({ walletAddress: address, month }),
  });

  const { metadataUri } = await res.json();

  // 2. Call smart contract to mint
  const { data: hash } = await writeContract({
    address: getActiveNFTContract(),
    abi: LEADERBOARD_NFT_ABI,
    functionName: 'mintLeaderboardNFT',
    args: [address, month, rank, metadataUri],
  });

  // 3. Wait for confirmation
  const receipt = await waitForTransactionReceipt({ hash });

  // 4. Update backend with token ID
  await fetch('/api/nft/claim', {
    method: 'PUT',
    body: JSON.stringify({
      walletAddress: address,
      month,
      tokenId: receipt.logs[0].tokenId,
      transactionHash: hash,
    }),
  });
};
```

## Future Enhancements

### Phase 1 (Current)
- ✅ Monthly leaderboard snapshots
- ✅ Top 5 eligibility tracking
- ✅ NFT metadata generation
- ✅ Claim window validation
- ✅ Frontend claim UI

### Phase 2 (Next)
- 🔜 Smart contract deployment
- 🔜 Actual NFT minting on claim
- 🔜 NFT display in UI (show owned NFTs)
- 🔜 Automatic monthly snapshots (cron)

### Phase 3 (Future)
- 💡 Mark coaching session as "used"
- 💡 Burn NFT after use
- 💡 Coaching session booking integration
- 💡 NFT marketplace integration (OpenSea)
- 💡 IPFS for metadata storage
- 💡 Unique artwork for each rank tier

## Troubleshooting

### No snapshots showing
- Ensure leaderboard has entries
- Run snapshot creation script
- Check Redis has `leaderboard_snapshots` key

### Can't claim NFT
- Check wallet is in top 5 for that month
- Verify claim window hasn't expired
- Ensure not already claimed
- Check browser console for errors

### NFT not showing in wallet
- Ensure smart contract is deployed
- Verify transaction was confirmed
- Check contract address in frontend
- Import NFT manually in wallet using contract address

## Support

For issues or questions:
- Check the browser console for errors
- Review API responses in Network tab
- Test with curl commands above
- Ensure all environment variables are set

---

**Note**: The smart contract deployment step is required for actual NFT minting. Until then, claims are recorded but NFTs are not minted.
