# Base Builder Code Implementation Guide

## Overview
Implement Base Builder Code attribution to track all transactions through Max Craic Poker and earn attribution credits.

---

## Step 1: Register for Builder Code

1. Go to https://base.dev
2. Sign in with your wallet
3. Register your app: **Max Craic Poker**
4. Get your **Builder Code** (e.g., "maxcraic" or similar)
5. Save it in environment variables

---

## Step 2: Add Environment Variable

Add to `.env.local`:
```bash
NEXT_PUBLIC_BUILDER_CODE=your-builder-code-here
```

---

## Step 3: Create Builder Code Utility

Create `lib/builderCode.ts`:

```typescript
// lib/builderCode.ts
import { encodePacked, keccak256, toHex } from 'viem';

/**
 * Generate Base Builder Code attribution suffix
 * @param builderCode - Your registered builder code from base.dev
 * @returns Hex string suffix to append to transaction calldata
 */
export function generateBuilderCodeSuffix(builderCode: string): `0x${string}` {
  // ERC-8021 format: keccak256("BUILDER_CODE")[0:20] + builderCode
  const builderCodeBytes = new TextEncoder().encode(builderCode);
  const hash = keccak256(encodePacked(['string'], ['BUILDER_CODE']));
  const prefix = hash.slice(0, 42); // First 20 bytes (0x + 40 chars)

  // Encode builder code as hex
  const builderCodeHex = toHex(builderCodeBytes);

  // Combine: prefix (20 bytes) + builderCode
  return `${prefix}${builderCodeHex.slice(2)}` as `0x${string}`;
}

/**
 * Get the builder code from environment
 */
export function getBuilderCode(): string {
  return process.env.NEXT_PUBLIC_BUILDER_CODE || '';
}

/**
 * Check if builder code attribution is enabled
 */
export function isBuilderCodeEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_BUILDER_CODE;
}
```

---

## Step 4: Update Wagmi Config (Optional - Use Capabilities)

If using `wallet_sendCalls`, update `lib/wagmi.ts`:

```typescript
// lib/wagmi.ts
import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';

export const config = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'Max Craic Poker',
      // Enable experimental wallet_sendCalls support
      preference: 'smartWalletOnly' // or 'all' for both EOA and smart wallets
    }),
  ],
  transports: {
    [base.id]: http(),
  },
});
```

---

## Step 5: Update Transaction Components

### Option A: Using `writeContract` with Manual Suffix (Current Method)

Update existing `writeContract` calls to append data suffix:

```typescript
// Example: app/mini-app/media/page.tsx
import { generateBuilderCodeSuffix, getBuilderCode, isBuilderCodeEnabled } from '@/lib/builderCode';
import { encodeAbiParameters, parseAbiParameters, concat } from 'viem';

// In your transaction function:
const handlePurchaseMembership = async () => {
  // ... existing code ...

  // Encode the transfer call
  const transferData = encodeFunctionData({
    abi: USDC_ABI,
    functionName: 'transfer',
    args: [CREATOR_ADDRESS, usdcAmount]
  });

  // Append builder code suffix if enabled
  let finalData = transferData;
  if (isBuilderCodeEnabled()) {
    const suffix = generateBuilderCodeSuffix(getBuilderCode());
    finalData = concat([transferData, suffix]);
  }

  // Send transaction with data suffix
  writeContract({
    address: USDC_CONTRACT,
    abi: USDC_ABI,
    functionName: 'transfer',
    args: [CREATOR_ADDRESS, usdcAmount],
    data: finalData, // Use modified data with suffix
  });
};
```

### Option B: Using `wallet_sendCalls` with `dataSuffix` Capability (Recommended)

This is the cleaner, modern approach using ERC-5792:

```typescript
// Example: app/mini-app/media/page.tsx
import { useWriteContracts, useCapabilities } from 'wagmi/experimental';
import { generateBuilderCodeSuffix, getBuilderCode } from '@/lib/builderCode';

export default function MediaPage() {
  const { address } = useAccount();

  // Use experimental useWriteContracts (wallet_sendCalls)
  const { writeContracts } = useWriteContracts();
  const { data: capabilities } = useCapabilities({ account: address });

  const handlePurchaseMembership = async () => {
    if (!address) {
      setPurchaseError('Please connect your wallet first');
      return;
    }

    setIsPurchasing(true);
    setPurchaseError(null);

    try {
      const amountInCents = 1000; // $10.00
      const usdcAmount = parseUnits((amountInCents / 100).toString(), 6);

      // Generate builder code suffix
      const builderCodeSuffix = generateBuilderCodeSuffix(getBuilderCode());

      // Use wallet_sendCalls with dataSuffix capability
      await writeContracts({
        contracts: [
          {
            address: USDC_CONTRACT,
            abi: USDC_ABI,
            functionName: 'transfer',
            args: [CREATOR_ADDRESS, usdcAmount],
          }
        ],
        capabilities: {
          dataSuffix: {
            enabled: true,
            suffix: builderCodeSuffix,
          }
        }
      });

    } catch (error: any) {
      console.error('Membership purchase error:', error);
      setPurchaseError(error.message || 'Failed to initiate transaction');
      setIsPurchasing(false);
    }
  };

  // ... rest of component
}
```

---

## Step 6: Apply to All Transaction Points

Update these components with builder code attribution:

### 1. **Membership Purchase** - `app/mini-app/media/page.tsx`
- Payment: $10 USDC membership fee
- Already identified above ✅

### 2. **Stream Tips** - `app/mini-app/home/page.tsx`
```typescript
// app/mini-app/home/page.tsx (lines ~220-280)
const handleTip = async (tokenAddress: string, amount: bigint) => {
  // ... existing validation ...

  const builderCodeSuffix = isBuilderCodeEnabled()
    ? generateBuilderCodeSuffix(getBuilderCode())
    : '0x';

  if (tokenAddress === '0x0000000000000000000000000000000000000000') {
    // Native ETH tip - use sendTransaction with data suffix
    // Note: May need wallet_sendCalls for proper attribution
  } else {
    // ERC-20 tip (USDC, DEGEN, etc.)
    await writeContracts({
      contracts: [{
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [CREATOR_ADDRESS, amount],
      }],
      capabilities: {
        dataSuffix: {
          enabled: true,
          suffix: builderCodeSuffix,
        }
      }
    });
  }
};
```

### 3. **Membership via MembershipCard** - `app/mini-app/components/MembershipCard.tsx`
Similar pattern - add builder code suffix to USDC transfers

### 4. **Video Tips** (Future) - `app/mini-app/media/[id]/page.tsx`
When users tip individual videos, add attribution

---

## Step 7: Test Attribution

### Testing Checklist:
- [ ] Register app on base.dev
- [ ] Add builder code to `.env.local`
- [ ] Create `lib/builderCode.ts` utility
- [ ] Update membership purchase transactions
- [ ] Update stream tip transactions
- [ ] Deploy to production
- [ ] Test a transaction on Base mainnet
- [ ] Verify attribution on Base block explorer
- [ ] Check base.dev dashboard for credited transactions

### Verification:
1. Make a test transaction (e.g., membership purchase)
2. Check transaction on BaseScan: https://basescan.org/tx/{txHash}
3. Look for your builder code in the transaction calldata (end of input data)
4. Monitor base.dev dashboard for attribution credits

---

## Notes:

### ERC-5792 vs Manual Suffix:
- **ERC-5792 (`wallet_sendCalls`)**: Modern, cleaner API. Works with Coinbase Wallet smart wallets.
- **Manual Suffix**: Works with all wallets but requires manual data concatenation.

### Wallet Compatibility:
- Coinbase Wallet (Smart Wallet): Full `wallet_sendCalls` support ✅
- MetaMask: Requires manual suffix approach
- WalletConnect: Depends on connected wallet

### Multiple Attributions:
The system supports multiple builder codes per transaction. If users connect through a wallet that also has a builder code, both codes get credited.

---

## Resources:

- Base Builder Codes Docs: https://docs.base.org/base-chain/quickstart/builder-codes
- ERC-5792 Standard: https://eips.ethereum.org/EIPS/eip-5792
- ERC-8021 Attribution: https://eips.ethereum.org/EIPS/eip-8021
- Register App: https://base.dev
- Wagmi Experimental Hooks: https://wagmi.sh/react/api/hooks/useWriteContracts

---

## Expected Benefits:

✅ Track all Max Craic Poker transactions onchain
✅ Get attribution credits from Base
✅ Potential for future Base ecosystem rewards/grants
✅ Analytics on app usage and transaction volume
✅ Professional app registration on Base

---

## Next Steps:

1. Register on base.dev → Get builder code
2. Create utility functions → Add to codebase
3. Update transaction components → Add attribution
4. Test on testnet → Verify suffix appears
5. Deploy to production → Monitor base.dev dashboard
