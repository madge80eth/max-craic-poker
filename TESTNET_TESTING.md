# Base Sepolia Testnet Testing Guide

This guide will help you test transactions on Base Sepolia testnet for the Base Batches 002 submission.

## Prerequisites

1. **Coinbase Wallet** or **MetaMask** installed
2. **Base Sepolia testnet ETH** (free from faucet)

---

## Step 1: Get Base Sepolia Testnet ETH

### Option A: Coinbase Wallet Faucet
1. Open Coinbase Wallet
2. Switch network to "Base Sepolia"
3. Use built-in faucet to get testnet ETH

### Option B: Base Sepolia Faucet
1. Visit: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
2. Connect your wallet
3. Request testnet ETH (0.1 ETH free)

### Option C: Alchemy Faucet
1. Visit: https://www.alchemy.com/faucets/base-sepolia
2. Sign in with Alchemy account
3. Request testnet ETH

---

## Step 2: Run App in Testnet Mode

### Local Development:

```bash
# Copy testnet environment
cp .env.testnet .env.local

# Verify testnet mode is enabled
cat .env.local | grep TESTNET

# Run development server
npm run dev
```

### Vercel Deployment (Testnet Branch):

1. Create a new branch for testnet:
```bash
git checkout -b testnet
git push origin testnet
```

2. In Vercel Dashboard:
   - Create new deployment from `testnet` branch
   - Add environment variable: `NEXT_PUBLIC_TESTNET=true`
   - Deploy

---

## Step 3: Test Transactions

### Test 1: Wallet Connection
1. Open the app: http://localhost:3000/mini-app
2. Connect your wallet
3. Verify it connects to Base Sepolia network
4. **Copy your wallet address**

### Test 2: Enter the Draw
1. Click "Enter the Draw" button
2. Approve the transaction in your wallet
3. Wait for confirmation
4. **Copy the transaction hash** from wallet or BaseScan

### Test 3: Verify on BaseScan
1. Visit: https://sepolia.basescan.org/
2. Search for your transaction hash
3. Confirm transaction is successful
4. **Screenshot the transaction page**

---

## Step 4: Document for Submission

Create a file with your proof:

```
TESTNET_PROOF.md

# Base Sepolia Testnet Deployment Proof

## Deployment URL
- Mainnet: https://max-craic-poker.vercel.app/mini-app
- Testnet: [your-testnet-url] or http://localhost:3000/mini-app

## Test Transactions

### Transaction 1: Wallet Connection & Entry
- **Transaction Hash**: 0x...
- **Block Number**:
- **From Address**: 0x...
- **BaseScan Link**: https://sepolia.basescan.org/tx/0x...
- **Status**: Success ✅

### Transaction 2: [Additional Test]
- **Transaction Hash**: 0x...
- **BaseScan Link**: https://sepolia.basescan.org/tx/0x...

## Screenshots
- [Attach screenshot of BaseScan transaction]
- [Attach screenshot of app with wallet connected]
```

---

## Step 5: Switch Back to Mainnet

```bash
# Restore mainnet environment
cp .env.local.backup .env.local

# Or manually remove the testnet flag
# Remove line: NEXT_PUBLIC_TESTNET=true
```

---

## Troubleshooting

### Issue: Wallet connects to wrong network
**Solution:** Manually switch to Base Sepolia in your wallet settings

### Issue: No testnet ETH received
**Solution:** Try a different faucet or wait 24 hours for reset

### Issue: Transaction fails
**Solution:**
- Check you have enough testnet ETH
- Verify correct network selected
- Clear browser cache and reconnect wallet

---

## Quick Test Script

For fast testing, you can:

1. Connect wallet (auto-detects testnet mode)
2. Enter the draw (creates on-chain transaction)
3. Copy transaction hash from wallet notification
4. Done! You have proof of testnet deployment

**Time Required:** ~5 minutes

---

## What Counts as Valid Proof?

✅ Any transaction interacting with your app on Base Sepolia
✅ Wallet connection transactions
✅ Contract interactions
✅ Token transfers
✅ Function calls

All transactions are visible on: https://sepolia.basescan.org/
