# Deploying SponsoredTournament.sol to Base Mainnet

## Prerequisites
- A wallet with some ETH on Base for gas
- The wallet address you want to use as the "game server" (this address will call `finishTournament` when games end)

## Option 1: Deploy via Remix (Recommended)

### Step 1: Open Remix
Go to https://remix.ethereum.org

### Step 2: Create the contract file
1. In the File Explorer, create a new file called `SponsoredTournament.sol`
2. Paste the contents of `contracts/SponsoredTournament.sol` from this repo

### Step 3: Install OpenZeppelin
In Remix, the `@openzeppelin/contracts` imports resolve automatically from npm.
No action needed.

### Step 4: Compile
1. Go to the "Solidity Compiler" tab (left sidebar)
2. Set compiler version to `0.8.20` or higher
3. Enable optimization (200 runs)
4. Click "Compile SponsoredTournament.sol"

### Step 5: Deploy
1. Go to the "Deploy & Run Transactions" tab
2. Set Environment to "Injected Provider - MetaMask"
3. Make sure MetaMask is connected to **Base Mainnet** (Chain ID 8453)
4. Select `SponsoredTournament` from the contract dropdown
5. Fill in constructor arguments:
   - `_usdc`: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (Base mainnet USDC)
   - `_gameServer`: Your game server wallet address (the address that will call finishTournament)
6. Click "Deploy"
7. Confirm the transaction in MetaMask

### Step 6: Verify on Basescan (Optional but recommended)
1. Go to https://basescan.org
2. Find your deployed contract address
3. Go to "Contract" > "Verify and Publish"
4. Select:
   - Compiler: v0.8.20
   - License: MIT
   - Optimization: Yes, 200 runs
5. Paste the flattened source (or use Remix's verification plugin)

### Step 7: Update the codebase
After deployment, update the contract address in:

```
lib/poker/sponsored-types.ts
```

Change:
```typescript
SPONSORED_TOURNAMENT: '0x0000000000000000000000000000000000000000' as `0x${string}`,
```

To:
```typescript
SPONSORED_TOURNAMENT: '0xYOUR_DEPLOYED_ADDRESS_HERE' as `0x${string}`,
```

## Option 2: Deploy via Foundry

```bash
# Install foundry if you don't have it
curl -L https://foundry.paradigm.xyz | bash
foundryup

# From the project root
cd contracts

# Deploy (replace with your values)
forge create \
  --rpc-url https://mainnet.base.org \
  --private-key YOUR_PRIVATE_KEY \
  SponsoredTournament \
  --constructor-args 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 YOUR_GAME_SERVER_ADDRESS

# Verify
forge verify-contract \
  --chain base \
  YOUR_DEPLOYED_ADDRESS \
  SponsoredTournament \
  --constructor-args $(cast abi-encode "constructor(address,address)" 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 YOUR_GAME_SERVER_ADDRESS)
```

## Constructor Arguments Reference

| Argument | Value | Description |
|----------|-------|-------------|
| `_usdc` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | USDC on Base mainnet |
| `_gameServer` | Your address | Wallet that calls `finishTournament` |

## Post-Deployment Checklist

- [ ] Contract deployed to Base mainnet
- [ ] Contract address updated in `lib/poker/sponsored-types.ts`
- [ ] Contract verified on Basescan
- [ ] Test `sponsorTournament` with a small amount ($1 USDC)
- [ ] Test `finishTournament` from game server address
- [ ] Test `cancelTournament` + refund flow
