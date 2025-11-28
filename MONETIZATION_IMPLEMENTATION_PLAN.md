# Monetization System Implementation Plan

## Overview
Complete overhaul of tipping system + new membership system + revenue tracking dashboard for admin.

---

## 🎯 Core Requirements

1. **Multi-Asset Tipping** - Accept any Base token (USDC default)
2. **Stream-Gated Tipping** - Tips only work when Retake stream is live
3. **Membership System** - Monthly subscription with configurable fee
4. **Revenue Tracking** - Admin dashboard showing ALL transactions
5. **Info Page Updates** - Membership benefits card

---

## 📋 Implementation Order

### Phase 1: Revenue Tracking Infrastructure (BASE)
**Why First:** All other features depend on transaction recording

**New Files:**
- `lib/revenue-redis.ts` - Revenue & membership Redis utilities

**Functions:**
- `recordTransaction()` - Log all transactions (tips, memberships, raffle distributions)
- `getAllTransactions()` - Fetch transaction history
- `getRevenueStats()` - Calculate totals with 5min cache
- `getMembershipSettings()` / `saveMembershipSettings()` - Config management
- `getMembership()` / `createMembership()` / `renewMembership()` - User memberships
- `getActiveMembershipsCount()` - Count active subs

**Redis Schema:**
```
transactions:all - ZSET (scored by timestamp)
transaction:{id} - HASH (tx metadata)
membership:{wallet} - HASH (membership data)
membership_settings - HASH (fee, benefits, enabled)
revenue_stats - HASH (cached calculations)
```

---

### Phase 2: Admin Revenue Tab
**Why Second:** Test revenue tracking with dummy data before building payment flows

**Modified Files:**
- `public/admin.html` - Add "Revenue" tab

**Features:**
1. **Summary Cards:**
   - Total Transaction Volume (USDC)
   - Your Cut (2% of volume)
   - Active Memberships (count)
   - Transaction Count

2. **Transaction List:**
   - Type (tip/membership/raffle)
   - Amount (USDC formatted)
   - Wallet Address
   - Timestamp
   - Transaction Hash (link to BaseScan)
   - Metadata (video title, raffle position, etc.)

3. **Auto-Refresh:** Every 30 seconds

**API Endpoint:**
- `GET /api/admin/revenue` - Returns RevenueStats + recent transactions

---

### Phase 3: Membership Settings in Admin
**Why Third:** Configure membership before building payment UI

**Modified Files:**
- `public/admin.html` - Add "Membership" tab

**Features:**
1. **Settings Form:**
   - Enable/Disable toggle
   - Monthly Fee (USDC input, converts to cents)
   - Benefits list (textarea, one per line)
   - Save button

2. **Current Members List:**
   - Wallet address
   - Status (active/expired)
   - Expiry date
   - Total paid

**API Endpoints:**
- `GET /api/admin/membership-settings` - Get current settings
- `POST /api/admin/membership-settings` - Update settings
- `GET /api/admin/memberships` - List all memberships

---

### Phase 4: Multi-Asset Tipping System
**Why Fourth:** Update tipping before adding membership (similar payment flow)

**Modified Files:**
- `app/api/videos/[id]/tip/route.ts` - Accept tokenAddress, tokenSymbol
- `app/mini-app/media/[id]/page.tsx` - Token selector dropdown + wallet integration

**Features:**
1. **Token Selector:**
   - Dropdown: USDC (default), ETH, DEGEN, HIGHER, etc.
   - Show user's balance for selected token
   - Auto-convert to USD for display

2. **Payment Flow:**
   - Connect wallet (OnchainKit)
   - User enters amount in USD
   - Convert to token units
   - Execute smart contract transfer
   - Record transaction in revenue system

3. **Stream-Gated:**
   - Check if Retake stream is live (check streamStartTime + 12hr window)
   - If not live, show "Tips available during live streams only"
   - Disable tip button

4. **Transaction Recording:**
   - Call `recordTransaction()` with type='tip'
   - Include videoId, videoTitle in metadata
   - Store tokenAddress, tokenSymbol, usdValue

**API Changes:**
```typescript
// POST /api/videos/[id]/tip
{
  amount: number,        // Token's smallest unit
  tokenAddress: string,  // Contract address
  tokenSymbol: string,   // "USDC", "ETH", etc.
  usdValue: number,      // USD cents for revenue tracking
  tipper: string,        // Wallet address
  txHash: string         // Transaction hash
}
```

---

### Phase 5: Membership Payment UI
**Why Fifth:** Similar to tipping but with subscription logic

**Modified Files:**
- `app/mini-app/info/page.tsx` - Add membership card + signup button
- `app/api/membership/subscribe/route.ts` - New endpoint for signup
- `app/api/membership/status/route.ts` - Check user's membership

**Features:**
1. **Membership Card in Info Page:**
   - Show monthly fee
   - List benefits from settings
   - "Subscribe Now" button (connect wallet required)
   - If already subscribed, show expiry date

2. **Payment Flow:**
   - Check membership settings (enabled?)
   - User clicks "Subscribe"
   - Execute USDC transfer for monthly fee
   - Create/renew membership via `createMembership()`
   - Record transaction with type='membership'

3. **Membership Status Check:**
   - On page load, check if user has active membership
   - Show "Active until {date}" or "Subscribe"
   - Auto-expire memberships past expiry date

**New Components:**
- `app/mini-app/components/MembershipCard.tsx` - Reusable membership display

---

### Phase 6: Raffle Distribution Tracking
**Why Last:** Integrate existing draw system with new revenue tracking

**Modified Files:**
- `app/api/draw/route.ts` - Record raffle distributions

**Changes:**
- After selecting winners, record 6 transactions (type='raffle_distribution')
- Include raffleId (sessionId), position (1-6) in metadata
- Amount = final percentage of prize pool (when known)

---

## 🔧 Technical Details

### Token Support (Base Mainnet)
```typescript
const SUPPORTED_TOKENS = {
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  ETH: '0x0000000000000000000000000000000000000000', // Native
  DEGEN: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed',
  HIGHER: '0x0578d8A44db98B23BF096A382e016e29a5Ce0ffe'
};
```

### OnchainKit Integration
```typescript
// Use OnchainKit Transaction component
import { Transaction } from '@coinbase/onchainkit/transaction';

// For USDC tips:
<Transaction
  contracts={[{
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [RECIPIENT_ADDRESS, amount]
  }]}
  onSuccess={handleSuccess}
/>
```

### Stream State Check
```typescript
// Check if stream is live
const tournamentsData = await getTournamentsData();
const streamStart = new Date(tournamentsData.streamStartTime).getTime();
const now = Date.now();
const isLive = now >= streamStart && now <= streamStart + (12 * 60 * 60 * 1000);
```

---

## 🎨 UI/UX Requirements

### Revenue Tab Design
- Cards use gradient backgrounds (green for volume, purple for cut)
- Transaction list is scrollable with hover effects
- Link transaction hashes to BaseScan
- Format USD values as $X,XXX.XX

### Membership Card Design
- Purple-pink gradient (matching MCP brand)
- Icon: Crown or Star
- Clear benefits list (checkmarks)
- Prominent "Subscribe" CTA
- Show expiry countdown for active members

### Tipping UI Updates
- Token selector with icons
- Balance display: "Balance: 100 USDC"
- USD equivalent shown in real-time
- "Stream offline - tips available during live streams"
- Success animation on payment

---

## 🧪 Testing Checklist

### Revenue Tracking
- [ ] Record dummy transactions manually
- [ ] Verify revenue stats calculate correctly
- [ ] Test 2% platform cut calculation
- [ ] Cache invalidation works

### Admin Dashboard
- [ ] Revenue tab displays all transactions
- [ ] Membership settings save/load correctly
- [ ] Transaction list scrolls and links work
- [ ] Auto-refresh updates data

### Tipping
- [ ] Multi-token selector works
- [ ] Balance fetching accurate
- [ ] Payment executes successfully
- [ ] Transaction recorded with correct metadata
- [ ] Stream-gating prevents tips when offline

### Membership
- [ ] Signup flow completes
- [ ] Membership status shows correctly
- [ ] Renewal extends expiry by 30 days
- [ ] Auto-expiration works
- [ ] Benefits display from settings

---

## 📦 Dependencies Needed

Already installed:
- `@coinbase/onchainkit` ✅
- Base SDK ✅
- Upstash Redis ✅

May need:
- ERC20 ABI (for token transfers)
- Price oracle for USD conversion (CoinGecko API or OnchainKit price feeds)

---

## 🚀 Deployment Notes

1. **Environment Variables:** None needed (uses existing Redis)
2. **Smart Contracts:** No deployment needed (using existing ERC20 tokens)
3. **Redis Keys:** New keys will auto-create
4. **Breaking Changes:** None (additive only)
5. **Migration:** No data migration needed

---

## ✅ Success Criteria

- [ ] Admin can see total revenue and 2% cut
- [ ] Admin can configure membership fee and benefits
- [ ] Users can tip in USDC, ETH, DEGEN, or HIGHER during live streams
- [ ] Users can subscribe to membership and see benefits
- [ ] All transactions appear in Revenue tab
- [ ] Transaction hashes link to BaseScan
- [ ] Membership auto-expires after 30 days
- [ ] Tips are blocked when stream is offline

---

## 🔄 Implementation Order Summary

1. ✅ **Revenue Infrastructure** - Base tracking system
2. **Admin Revenue Tab** - Visualize data
3. **Admin Membership Settings** - Configure before users see it
4. **Multi-Asset Tipping** - Payment flow #1
5. **Membership Signup** - Payment flow #2
6. **Raffle Integration** - Connect existing system

**Estimated Time:** 4-6 hours total (assuming OnchainKit integration is smooth)

---

Ready to proceed with Phase 1: Revenue Tracking Infrastructure?
