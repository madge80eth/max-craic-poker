# Base Batches 002 - Deployment & Transaction Proof

## Quick Method: Deploy Verification Contract (5 minutes)

### Step 1: Deploy Using Remix IDE

1. **Open Remix**: https://remix.ethereum.org/

2. **Create Contract**:
   - Click "contracts" folder
   - Create new file: `Verification.sol`
   - Copy contents from `/contracts/Verification.sol`

3. **Compile**:
   - Click "Solidity Compiler" (left sidebar)
   - Click "Compile Verification.sol"

4. **Connect Wallet**:
   - Click "Deploy & Run Transactions" (left sidebar)
   - Environment: Select "Injected Provider - MetaMask"
   - Ensure MetaMask is on **Base Mainnet** (Chain ID: 8453)

5. **Deploy Contract**:
   - Click "Deploy" button
   - Approve transaction in MetaMask
   - **Wait for confirmation**
   - **Copy the contract address** from console

6. **Call verify() Function**:
   - Find deployed contract in "Deployed Contracts" section
   - Expand the contract
   - In `verify` field, enter: `"Base Batches 002 Submission"`
   - Click "transact" button
   - Approve in MetaMask
   - **Copy transaction hash from MetaMask**

### Step 2: Verify on BaseScan

1. Visit: https://basescan.org/
2. Search for your transaction hash
3. Screenshot the transaction page
4. Note the contract address

---

## Alternative Method: Simple ETH Transfer (2 minutes)

If you want the fastest proof:

1. **Open Your Wallet** (MetaMask/Coinbase Wallet)
2. **Switch to Base Mainnet**
3. **Send 0.001 ETH to your app's wallet**:
   - To: `0x849e78D6C4fB87d152d1Da384c353712E4b1c1C5`
   - Amount: 0.001 ETH
   - Note: "Base Batches 002 Test Transaction"
4. **Copy the transaction hash**
5. **View on BaseScan**: https://basescan.org/tx/[YOUR_TX_HASH]

---

## What Counts as Valid Proof?

For Base Batches 002 submission, you need:

✅ **Contract Deployment Transaction** (recommended)
- Proves you can deploy to Base
- Shows technical capability
- More impressive for judges

✅ **Contract Interaction Transaction**
- Calling a function on your contract
- Shows functional app

✅ **Simple Transfer Transaction**
- Proves Base connectivity
- Validates wallet integration
- Acceptable minimum proof

---

## Submission Documentation Template

```markdown
# Base Mainnet Deployment Proof

## Project Information
- **Project Name**: Max Craic Poker
- **Deployment URL**: https://max-craic-poker.vercel.app/mini-app
- **GitHub Repo**: https://github.com/madge80eth/max-craic-poker

## Base Integration
- ✅ Deployed on Base Mainnet (Chain ID: 8453)
- ✅ Basenames integration implemented
- ✅ Smart Wallet (Base Account) support enabled
- ✅ Uses wagmi + Coinbase Wallet connector

## Transaction Proof

### Deployment Transaction
- **Transaction Hash**: 0x...
- **Block Number**:
- **Contract Address**: 0x...
- **BaseScan Link**: https://basescan.org/tx/0x...
- **Timestamp**:
- **Status**: ✅ Success

### Test Interaction Transaction
- **Transaction Hash**: 0x...
- **Function Called**: verify("Base Batches 002 Submission")
- **BaseScan Link**: https://basescan.org/tx/0x...
- **Status**: ✅ Success

## Screenshots
- [ ] BaseScan contract deployment page
- [ ] BaseScan transaction confirmation
- [ ] App running with wallet connected
- [ ] Basenames resolution in action

## Technical Stack
- Next.js 15.4.1
- wagmi 2.17.5
- viem 2.37.9
- @coinbase/onchainkit 0.38.19
- Base + Base Sepolia support

## Base Batches 002 Compliance
✅ One project per team
✅ Functioning onchain app at public URL
✅ Open-source GitHub repository
❌ Video demonstration (1+ min) - IN PROGRESS
✅ Basenames + Base Account integration
✅ Proof of deployment + transactions on Base
```

---

## Need Help?

### Can't Deploy Contract?
- **Issue**: No ETH on Base
- **Solution**: Bridge from Ethereum mainnet or buy on Coinbase

### Transaction Failing?
- **Issue**: Insufficient gas
- **Solution**: Ensure you have ~$1-2 worth of ETH for gas

### Want More Impressive Proof?
- Deploy the full entry contract (30 min)
- Create multiple test transactions
- Show contract interactions with events

---

## Next Steps After Getting Transaction Hash

1. ✅ Copy transaction hash
2. ✅ Verify on BaseScan
3. ✅ Screenshot the page
4. ✅ Update README with proof
5. ✅ Include in buildathon submission
6. 🎥 Create video demo (final requirement)

---

**Estimated Time**: 5-10 minutes for basic proof
**Cost**: ~$0.10-0.50 in gas fees on Base mainnet
