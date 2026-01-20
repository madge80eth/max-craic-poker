# Craic Protocol Deployment Guide

## Overview

Craic Protocol is a trustless poker home game product for web3 communities, deployed as a Farcaster/Base mini app.

**Domains:**
- Primary: `craicprotocol.com`
- Subdomain: `maxcraic.com` (redirects/alias)

## Prerequisites

1. **Foundry** - Install from https://getfoundry.sh
2. **Vercel CLI** - `npm i -g vercel`
3. **USDC** - Ensure deployer wallet has Base ETH for gas

## Step 1: Deploy Smart Contract

### 1.1 Set Environment Variables

Create a `.env` file for Foundry (do NOT commit):

```bash
DEPLOYER_PRIVATE_KEY=your_private_key_here
GAME_SERVER_ADDRESS=0x849c78D6C4fB87d152d1Da384c353712E4b1c1C5
BASE_RPC_URL=https://mainnet.base.org
BASESCAN_API_KEY=your_basescan_api_key
```

### 1.2 Install Foundry Dependencies

```bash
# Install OpenZeppelin contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit
```

### 1.3 Deploy to Base Mainnet

```bash
# Dry run (simulation)
forge script script/DeployCraicTournament.s.sol:DeployCraicTournament \
  --rpc-url base \
  -vvvv

# Actual deployment with verification
forge script script/DeployCraicTournament.s.sol:DeployCraicTournament \
  --rpc-url base \
  --broadcast \
  --verify \
  -vvvv
```

### 1.4 Update Environment

After deployment, copy the contract address and update:

1. `.env.local`:
   ```
   NEXT_PUBLIC_CRAIC_CONTRACT_ADDRESS=0x...deployed_address...
   ```

2. Vercel environment variables (in dashboard)

## Step 2: Configure Domains in Vercel

### 2.1 Add Domains

In Vercel Dashboard → Project → Settings → Domains:

1. Add `craicprotocol.com`
2. Add `www.craicprotocol.com` (redirect to apex)
3. Add `maxcraic.com` (optional subdomain)

### 2.2 Update DNS Records

At your domain registrar (e.g., Namecheap, Cloudflare):

**For craicprotocol.com:**
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

## Step 3: Generate Farcaster Account Association

The manifest at `/public/craic/.well-known/farcaster.json` needs a valid account association.

### 3.1 Generate Signature

Use the Farcaster dev tools or SDK to generate:

```typescript
import { generateAccountAssociation } from '@farcaster/auth-kit';

const association = await generateAccountAssociation({
  domain: 'craicprotocol.com',
  fid: YOUR_FID,
  custodyAddress: YOUR_CUSTODY_ADDRESS,
});

console.log(JSON.stringify(association, null, 2));
```

### 3.2 Update Manifest

Replace the `accountAssociation` object in `/public/craic/.well-known/farcaster.json`:

```json
{
  "accountAssociation": {
    "header": "eyJ...",
    "payload": "eyJ...",
    "signature": "..."
  }
}
```

## Step 4: Deploy to Vercel

### 4.1 Push Changes

```bash
git add .
git commit -m "Add Craic Protocol deployment configuration"
git push
```

### 4.2 Verify Deployment

1. Check `https://craicprotocol.com` loads the Craic Protocol landing page
2. Check `https://craicprotocol.com/.well-known/farcaster.json` returns the manifest
3. Test in Warpcast by searching for the mini app

## Step 5: Submit to Farcaster

1. Go to https://warpcast.com/~/developers/frames
2. Submit your mini app for review
3. Provide:
   - App URL: `https://craicprotocol.com`
   - Category: Games
   - Description: Trustless poker nights for web3 communities

## Progress (Updated: Jan 20, 2026)

### Completed
- [x] **Contract deployed to Base Sepolia (testnet):** `0x83d1847EE856DA9566D99F1bc2cCb304876E729E`
- [x] **Contract deployed to Base Mainnet:** `0x1918c9cACbf3b7AFa2d05FaDFBd44fA64584bD99`
- [x] **Domain configured:** `craicprotocol.com` pointing to Vercel
- [x] **DNS validated:** SSL certificate issued
- [x] **Farcaster account association generated** via Warpcast Manifests tool
- [x] **Middleware configured:** Routes craic domains to craic-specific pages
- [x] **API route created:** `/api/craic-manifest` serves domain-specific farcaster.json
- [x] **Git deployment connected:** Both Vercel projects now auto-deploy from madge80eth/max-craic-poker

### Pending Verification
- [ ] Confirm build succeeds after removing duplicate (craic) route group
- [ ] Test `https://craicprotocol.com/.well-known/farcaster.json` returns Craic manifest
- [ ] Test landing page loads at `https://craicprotocol.com`
- [ ] Submit mini app to Warpcast for review

### Known Issues Fixed
1. **Duplicate route group:** Removed `app/(craic)/` which conflicted with `app/craic-*` routes
2. **Re-export imports:** Replaced re-exports with full standalone page implementations
3. **Vercel project not connected:** Connected `mcp-frame-clean` project to Git repo

---

## Testing Checklist

- [x] Contract deployed and verified on Basescan
- [ ] `craicprotocol.com` resolves correctly
- [ ] Farcaster manifest accessible at `/.well-known/farcaster.json`
- [ ] Landing page loads with GGPoker aesthetic
- [ ] Create game wizard works
- [ ] Game lobby displays correctly
- [ ] Poker table renders and accepts actions
- [ ] Wallet connection works in mini app context

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_CRAIC_CONTRACT_ADDRESS` | CraicTournament contract | Yes |
| `GAME_SERVER_ADDRESS` | Wallet for finishing tournaments | Yes |
| `BASE_RPC_URL` | Base mainnet RPC | Yes |
| `BASESCAN_API_KEY` | For contract verification | Optional |
| `UPSTASH_REDIS_REST_URL` | Redis for game state | Yes |
| `UPSTASH_REDIS_REST_TOKEN` | Redis auth | Yes |

## Troubleshooting

### Contract Verification Failed
- Ensure BASESCAN_API_KEY is set
- Try manual verification at basescan.org

### Manifest Not Loading
- Check CORS headers in `next.config.ts`
- Verify middleware routing is correct

### Domain Not Resolving
- Wait for DNS propagation (up to 48h)
- Verify A/CNAME records are correct

### Mini App Not Found in Warpcast
- Ensure account association signature is valid
- Check FID matches the domain owner
