# Deploy CraicTournament via Remix IDE

## TESTNET FIRST (Recommended)
Deploy to Base Sepolia first, test everything, then deploy to mainnet.

---

## Step 1: Open Remix
Go to: **https://remix.ethereum.org**

## Step 2: Create Contract File
1. In the File Explorer (left panel), click the "+" icon to create a new file
2. Name it: `CraicTournament.sol`
3. Copy the entire contents of `contracts/CraicTournament.flat.sol` into this file

## Step 3: Compile
1. Click the **Solidity Compiler** tab (left sidebar, looks like an "S")
2. Set compiler version to: **0.8.20**
3. Enable **Optimization** (set runs to 200)
4. Click **Compile CraicTournament.sol**
5. Should see green checkmark when done

## Step 4: Connect MetaMask to Base
1. Open MetaMask
2. Switch network to **Base Mainnet**
   - If not added, use: https://chainlist.org/chain/8453
3. Ensure you have ETH for gas (~0.001 ETH should be enough)

## Step 5: Deploy

### For Base Sepolia (TESTNET - do this first!)
1. Click the **Deploy & Run Transactions** tab (left sidebar, looks like an arrow)
2. Set Environment to: **Injected Provider - MetaMask**
3. Make sure MetaMask is on **Base Sepolia** network
4. Get testnet ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
5. In the "CONTRACT" dropdown, select: **CraicTournament**
6. Fill in constructor parameters:
   - `_usdc`: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Base Sepolia USDC)
   - `_gameServer`: `0x849c78D6C4fB87d152d1Da384c353712E4b1c1C5` (your game server wallet)
7. Click **Deploy**
8. MetaMask will pop up - confirm the transaction

### For Base Mainnet (after testing!)
1. Click the **Deploy & Run Transactions** tab (left sidebar, looks like an arrow)
2. Set Environment to: **Injected Provider - MetaMask**
3. Make sure MetaMask is on **Base Mainnet** network
4. In the "CONTRACT" dropdown, select: **CraicTournament**
5. Fill in constructor parameters:
   - `_usdc`: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (Base Mainnet USDC)
   - `_gameServer`: `0x849c78D6C4fB87d152d1Da384c353712E4b1c1C5` (your game server wallet)
6. Click **Deploy**
7. MetaMask will pop up - confirm the transaction
8. Wait for transaction to confirm (~2-5 seconds on Base)

## Step 6: Get Contract Address
1. After deployment, expand the "Deployed Contracts" section
2. Copy the contract address (starts with 0x...)
3. Save this address!

## Step 7: Verify on Basescan (Optional but Recommended)
1. Go to: https://basescan.org/verifyContract
2. Enter contract address
3. Select:
   - Compiler Type: Solidity (Single file)
   - Compiler Version: v0.8.20
   - License: MIT
4. Paste the flattened source code
5. Constructor Arguments (ABI-encoded):
   ```
   Use https://abi.hashex.org/ to encode:
   - address: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
   - address: 0x849c78D6C4fB87d152d1Da384c353712E4b1c1C5
   ```

## Step 8: Update Environment Variable
After deployment, update `.env.local`:
```
NEXT_PUBLIC_CRAIC_CONTRACT_ADDRESS=0x...your_deployed_address...
```

Also add this to Vercel Environment Variables in the dashboard.

---

## Constructor Parameters Reference

| Parameter | Value | Description |
|-----------|-------|-------------|
| `_usdc` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | Base mainnet USDC |
| `_gameServer` | `0x849c78D6C4fB87d152d1Da384c353712E4b1c1C5` | Wallet that can finish tournaments |

---

## Troubleshooting

### "Gas estimation failed"
- Ensure MetaMask is connected to Base Mainnet
- Ensure you have ETH for gas

### "Compiler version mismatch"
- Make sure Remix compiler is set to exactly 0.8.20

### "Contract verification failed"
- Try using the flattened source code
- Ensure optimization settings match (enabled, 200 runs)
