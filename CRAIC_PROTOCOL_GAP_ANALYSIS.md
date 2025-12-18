# CRAIC Protocol Gap Analysis: MCP → Multi-Creator Platform

**Date:** 2025-12-18
**Current State:** Single-tenant (Max Craic Poker)
**Target State:** Multi-tenant protocol for any poker creator
**Business Model:** Protocol infrastructure with 2% platform fee

---

## Executive Summary

**Multi-tenancy foundation is 60% complete.** Key infrastructure exists but most API endpoints still use hardcoded single-tenant Redis keys. Critical gaps are in:

1. **Revenue routing** - All payments go to Dom's wallet, no per-creator wallets
2. **API migration** - 45 of 47 API routes still using global keys instead of creator-scoped
3. **Creator onboarding** - No self-service signup flow
4. **Documentation** - Zero docs for creators wanting to deploy

**Time to first non-Dom creator:** ~40-60 hours of focused work.

---

## 1. Architecture Gap Analysis

### ✅ What's Already Built (Foundation Layer)

#### Multi-Tenant Infrastructure (60% Complete)
**Files:** `lib/creator-context.ts`, `lib/creator-redis.ts`, `middleware.ts`

**What Works:**
- ✅ Creator profile schema defined with full metadata
- ✅ Subdomain routing (`weazel.craicprotocol.com → weazel-poker`)
- ✅ Custom domain mapping (`maxcraicpoker.com → max-craic-poker`)
- ✅ Middleware adds `x-creator-id` header to all requests
- ✅ Helper function `getCreatorKey(creatorId, key)` for scoped Redis keys
- ✅ Creator CRUD operations (create, read, update, getAll)
- ✅ Super-admin endpoint exists: `/api/super-admin/creators`

**Creator Profile Schema:**
```typescript
interface Creator {
  id: string;                    // 'max-craic-poker', 'weazel-poker'
  name: string;                  // Display name
  subdomain: string;             // Subdomain slug
  walletAddress: string;         // Payout wallet for this creator
  platformFeePercentage: number; // Default 2%
  branding: {
    primaryColor?: string;
    logoUrl?: string;
    customDomain?: string;
  };
  features: {
    tippingEnabled: boolean;
    membershipEnabled: boolean;
    rafflesEnabled: boolean;
  };
  createdAt: number;
  isActive: boolean;
}
```

**Redis Schema:**
```
creators:all                    → SET of all creator IDs
creator:{id}:profile            → Creator metadata
creator:{id}:tournaments_data   → Session config
creator:{id}:raffle_entries     → Draw entries
creator:{id}:raffle_winners     → Winners
creator:{id}:hoth:*             → Hand of the Hour data
creator:{id}:tips:*             → Tips data
```

#### What's Partially Scoped

**Session Management** (`lib/session.ts`):
- ✅ Uses `getCreatorKey()` for tournaments_data
- ✅ Uses `getCreatorKey()` for session tracking
- ✅ Auto-reset logic supports creator parameter
- ⚠️ **BUT**: Only 2 of 47 API routes actually pass creatorId

**Revenue Tracking** (`lib/revenue-redis.ts`):
- ✅ Transaction recording working
- ✅ Revenue stats aggregation working
- ❌ **BUT**: NOT creator-scoped! Uses global keys like `transaction:{id}`
- ❌ All revenue goes into one global pool

### ❌ What's Missing (Critical Gaps)

#### 1. API Endpoint Migration (CRITICAL - 8-12 hours)

**Status:** Only 1 of 47 routes is fully creator-aware

**Problem:** Most endpoints still use hardcoded keys:
```typescript
// CURRENT (wrong):
await redis.get('raffle_entries');          // Global key
await redis.get('hoth:active');             // Global key
await redis.get('membership_settings');     // Global key

// NEEDED (correct):
const creatorId = request.headers.get('x-creator-id') || DEFAULT_CREATOR_ID;
await redis.get(getCreatorKey(creatorId, 'raffle_entries'));
await redis.get(getCreatorKey(creatorId, 'hoth:active'));
await redis.get(getCreatorKey(creatorId, 'membership_settings'));
```

**Routes Needing Migration:**
```
HIGH PRIORITY (Core Raffle/Draw):
✅ /api/draw/route.ts                    [DONE - uses getCreatorKey]
❌ /api/enter/route.ts                   [NEEDS: raffle_entries scoping]
❌ /api/status/route.ts                  [NEEDS: raffle_* scoping]
❌ /api/reset/route.ts                   [NEEDS: raffle_* scoping]
❌ /api/manual-draw/route.ts             [NEEDS: raffle_* scoping]
❌ /api/leaderboard/route.ts             [NEEDS: entry_history scoping]
❌ /api/leaderboard/snapshot/route.ts    [NEEDS: scoping]

MEDIUM PRIORITY (HOTH):
❌ /api/hoth/add/route.ts                [NEEDS: hoth:queue scoping]
❌ /api/hoth/release/route.ts            [NEEDS: hoth:active, hoth:queue]
❌ /api/hoth/vote/route.ts               [NEEDS: hoth:active scoping]
❌ /api/hoth/status/route.ts             [NEEDS: hoth:* scoping]
❌ /api/hoth/results/route.ts            [NEEDS: hoth:session_results]
❌ /api/hoth/end-game/route.ts           [NEEDS: winner push scoping]
❌ /api/hoth/clear-session/route.ts      [NEEDS: scoping]
❌ /api/hoth/delete/route.ts             [NEEDS: hoth:queue scoping]

MEDIUM PRIORITY (Tips & Membership):
❌ /api/tip/route.ts                     [NEEDS: session:*:tips scoping]
❌ /api/tips/route.ts                    [NEEDS: scoping]
❌ /api/tips/leaderboard/route.ts        [NEEDS: scoping]
❌ /api/membership/subscribe/route.ts    [NEEDS: membership:* scoping]
❌ /api/membership/check/route.ts        [NEEDS: scoping]
❌ /api/membership/status/route.ts       [NEEDS: scoping]

ADMIN ENDPOINTS:
❌ /api/admin/revenue/route.ts           [NEEDS: transaction:* scoping]
❌ /api/admin/revenue/export/route.ts    [NEEDS: scoping]
❌ /api/admin/memberships/route.ts       [NEEDS: membership:* scoping]
❌ /api/admin/membership-settings/route.ts [NEEDS: scoping]
❌ /api/admin/payout-records/route.ts    [NEEDS: scoping]
❌ /api/admin/update-tournaments/route.ts [NEEDS: scoping]
❌ /api/admin/videos/route.ts            [NEEDS: videos:* scoping]
❌ /api/admin/hoth-settings/route.ts     [NEEDS: hoth:settings scoping]

VIDEO ENDPOINTS:
❌ /api/videos/route.ts                  [NEEDS: videos:* scoping]
❌ /api/videos/[id]/route.ts             [NEEDS: scoping]
❌ /api/videos/[id]/tip/route.ts         [NEEDS: scoping]
❌ /api/videos/[id]/view/route.ts        [NEEDS: scoping]
❌ /api/videos/signed-url/route.ts       [NEEDS: scoping]

OTHER:
❌ /api/home/deal/route.ts               [NEEDS: scoping]
❌ /api/home/status/route.ts             [NEEDS: scoping]
❌ /api/share/route.ts                   [NEEDS: scoping]
❌ /api/frame/route.ts                   [NEEDS: scoping]
❌ /api/frame-image/route.tsx            [NEEDS: scoping]
❌ /api/user-stats/route.ts              [NEEDS: scoping]
```

**Migration Pattern Template:**
```typescript
// Step 1: Extract creator ID from middleware header
import { DEFAULT_CREATOR_ID, getCreatorKey } from '@/lib/creator-context';

export async function POST(request: NextRequest) {
  const creatorId = request.headers.get('x-creator-id') || DEFAULT_CREATOR_ID;

  // Step 2: Replace all hardcoded keys
  const entries = await redis.hgetall(getCreatorKey(creatorId, 'raffle_entries'));
  const winners = await redis.get(getCreatorKey(creatorId, 'raffle_winners'));

  // Step 3: Pass creatorId to helper functions
  await checkAndResetSession(creatorId);
  await getTournamentsData(creatorId);
}
```

**Estimated Effort:**
- High Priority: 6 hours (core raffle mechanics)
- Medium Priority HOTH: 3 hours
- Medium Priority Tips/Membership: 2 hours
- Admin Endpoints: 2 hours
- Video Endpoints: 2 hours
- Other: 1 hour
- **Total: 16 hours**

#### 2. Revenue Routing Architecture (CRITICAL - 4-6 hours)

**Problem:** All payments currently go to single wallet defined in env var:
```typescript
// Current (wrong):
walletAddress: process.env.NEXT_PUBLIC_TIP_WALLET_ADDRESS
```

**What's Needed:**

**A. Creator Wallet Resolution**
```typescript
// lib/creator-wallet.ts (NEW FILE)
export async function getCreatorWallet(creatorId: string): Promise<string> {
  const creator = await getCreator(creatorId);
  if (!creator) throw new Error('Creator not found');
  return creator.walletAddress;
}

export async function getPlatformWallet(): Promise<string> {
  return process.env.PLATFORM_WALLET_ADDRESS ||
         '0x...'; // Protocol-owned wallet for 2% fees
}
```

**B. Revenue Split Logic**
```typescript
// lib/revenue-split.ts (NEW FILE)
export interface RevenueSplit {
  creatorAmount: number;      // 98% of payment
  platformAmount: number;      // 2% platform fee
  creatorWallet: string;
  platformWallet: string;
}

export async function calculateRevenueSplit(
  creatorId: string,
  totalAmount: number
): Promise<RevenueSplit> {
  const creator = await getCreator(creatorId);
  const platformFee = creator.platformFeePercentage || 2;

  const platformAmount = Math.round(totalAmount * (platformFee / 100));
  const creatorAmount = totalAmount - platformAmount;

  return {
    creatorAmount,
    platformAmount,
    creatorWallet: creator.walletAddress,
    platformWallet: await getPlatformWallet()
  };
}
```

**C. Transaction Recording** (Update existing)
```typescript
// lib/revenue-redis.ts - UPDATE recordTransaction()
export async function recordTransaction(
  transaction: Omit<Transaction, 'id'>,
  creatorId: string  // NEW PARAMETER
): Promise<Transaction> {
  const id = `tx_${transaction.timestamp}_${randomStr}`;

  // Store under creator namespace
  const key = getCreatorKey(creatorId, `transaction:${id}`);
  await redis.hset(key, { ...data });

  // Add to creator's transaction index
  const indexKey = getCreatorKey(creatorId, 'transactions:all');
  await redis.zadd(indexKey, { score: timestamp, member: id });

  // ALSO add to global platform revenue tracking
  await redis.zadd('platform:transactions:all', { score: timestamp, member: id });
}
```

**D. Frontend Payment Flow Updates**

Update all payment components to use creator wallet:
- `app/mini-app/components/TipButton.tsx`
- `app/mini-app/components/MembershipCard.tsx`
- Payment modals in draw/raffle flows

```typescript
// BEFORE:
const recipientAddress = process.env.NEXT_PUBLIC_TIP_WALLET_ADDRESS;

// AFTER:
const { creatorWallet } = await fetch('/api/creator-wallet').then(r => r.json());
const recipientAddress = creatorWallet;
```

**E. Admin Revenue Dashboard**

Update Revenue tab to show per-creator breakdown:
- Creator earnings (98%)
- Platform fees collected (2%)
- Transaction history filterable by creator

**Estimated Effort:** 6 hours

#### 3. Backwards Compatibility & Migration (MEDIUM - 4-6 hours)

**Problem:** Existing Max Craic Poker data lives in un-prefixed Redis keys. Need migration without data loss.

**What's Needed:**

**A. Migration Script**
```typescript
// scripts/migrate-to-multi-tenant.ts (NEW FILE)
import { redis } from './lib/redis';
import { DEFAULT_CREATOR_ID, getCreatorKey } from './lib/creator-context';

async function migrateToMultiTenant() {
  console.log('Starting multi-tenant migration...');

  const keysToMigrate = [
    'raffle_entries',
    'raffle_winners',
    'raffle_session',
    'entry_history',
    'tournaments_data',
    'current_session_id',
    'hoth:queue',
    'hoth:active',
    'hoth:session_results',
    'hoth:settings',
    'membership_settings',
    'tips_total',
    'videos:all'
  ];

  for (const oldKey of keysToMigrate) {
    const data = await redis.get(oldKey);
    if (data) {
      const newKey = getCreatorKey(DEFAULT_CREATOR_ID, oldKey);
      await redis.set(newKey, data);
      console.log(`✅ Migrated: ${oldKey} → ${newKey}`);
    }
  }

  // Migrate hash-based keys
  const membershipKeys = await redis.keys('membership:*');
  for (const oldKey of membershipKeys) {
    const walletPart = oldKey.replace('membership:', '');
    const newKey = getCreatorKey(DEFAULT_CREATOR_ID, `membership:${walletPart}`);
    const data = await redis.hgetall(oldKey);
    await redis.hset(newKey, data);
    console.log(`✅ Migrated: ${oldKey} → ${newKey}`);
  }

  // Migrate transactions
  const txKeys = await redis.keys('transaction:*');
  for (const oldKey of txKeys) {
    const txId = oldKey.replace('transaction:', '');
    const newKey = getCreatorKey(DEFAULT_CREATOR_ID, `transaction:${txId}`);
    const data = await redis.hgetall(oldKey);
    await redis.hset(newKey, data);
  }

  console.log('✅ Migration complete!');
  console.log('⚠️  Old keys still exist. Review and delete manually.');
}

migrateToMultiTenant();
```

**B. Dual-Read Fallback Logic** (Temporary)

Add to helper functions during transition period:
```typescript
export async function getTournamentsData(creatorId: string): Promise<TournamentsData | null> {
  // Try creator-scoped key first
  const scopedKey = getCreatorKey(creatorId, 'tournaments_data');
  let data = await redis.get(scopedKey);

  // Fallback to legacy key for default creator
  if (!data && creatorId === DEFAULT_CREATOR_ID) {
    const legacyData = await redis.get('tournaments_data');
    if (legacyData) {
      // Migrate on read
      await redis.set(scopedKey, legacyData);
      data = legacyData;
      console.log('📦 Auto-migrated tournaments_data to creator-scoped key');
    }
  }

  return data ? JSON.parse(data) : null;
}
```

**C. Gradual Rollout Plan**
1. Deploy migration script to production
2. Run script to copy data (doesn't delete originals)
3. Deploy code with dual-read fallback
4. Monitor logs for auto-migrations
5. After 7 days of zero fallbacks, delete old keys

**Estimated Effort:** 4 hours

#### 4. Creator Isolation Validation (LOW - 2 hours)

**What's Needed:**

**A. Test Suite**
```typescript
// tests/multi-tenant-isolation.test.ts (NEW FILE)
describe('Multi-Tenant Data Isolation', () => {
  it('should isolate raffle entries between creators', async () => {
    // Creator A enters raffle
    const resA = await fetch('/api/enter', {
      headers: { host: 'creatorA.craicprotocol.com' },
      body: { address: '0xAAA' }
    });

    // Creator B enters raffle
    const resB = await fetch('/api/enter', {
      headers: { host: 'creatorB.craicprotocol.com' },
      body: { address: '0xBBB' }
    });

    // Verify Creator A status shows only 0xAAA
    const statusA = await fetch('/api/status', {
      headers: { host: 'creatorA.craicprotocol.com' }
    });
    expect(statusA.entryCount).toBe(1);

    // Verify Creator B status shows only 0xBBB
    const statusB = await fetch('/api/status', {
      headers: { host: 'creatorB.craicprotocol.com' }
    });
    expect(statusB.entryCount).toBe(1);
  });

  it('should isolate HOTH games between creators', async () => {
    // Creator A adds hand
    // Creator B adds hand
    // Verify isolated queues
  });

  it('should isolate membership subscriptions', async () => {
    // ...
  });
});
```

**B. Manual QA Checklist**
- [ ] Create test creator via `/api/super-admin/creators`
- [ ] Access via subdomain (requires DNS or hosts file)
- [ ] Enter raffle, verify isolated from Max Craic
- [ ] Add HOTH hand, verify isolated queue
- [ ] Check Revenue tab shows $0 for new creator
- [ ] Verify payments route to new creator's wallet

**Estimated Effort:** 2 hours

---

## 2. Onboarding Gap Analysis

### ✅ What Exists
- ❌ **Nothing.** No creator onboarding flow exists.
- ✅ Super-admin endpoint `/api/super-admin/creators` can create creators
- ✅ Middleware routes subdomains correctly once creator exists

### ❌ What's Missing

#### 1. Self-Service Creator Signup (HIGH - 6-8 hours)

**What's Needed:**

**A. Public Signup Page**
```
/signup/page.tsx (NEW FILE)

Form fields:
- Creator Name (display name)
- Subdomain (lowercase, alphanumeric + hyphens)
- Wallet Address (for payouts)
- Email (optional, for notifications)
- Terms acceptance checkbox

Validation:
- Subdomain uniqueness check
- Wallet address format validation
- Real-time subdomain availability
```

**B. Signup API Endpoint**
```typescript
// /api/signup/route.ts (NEW FILE)
export async function POST(req: NextRequest) {
  const { name, subdomain, walletAddress, email } = await req.json();

  // Validate subdomain not taken
  const existing = await getCreatorBySubdomain(subdomain);
  if (existing) {
    return NextResponse.json({ error: 'Subdomain taken' }, { status: 400 });
  }

  // Validate wallet format
  if (!isAddress(walletAddress)) {
    return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 });
  }

  // Create creator (initially inactive, requires approval?)
  const creator = await createCreator({
    id: `${subdomain}-poker`,
    name,
    subdomain,
    walletAddress,
    platformFeePercentage: 2,
    branding: {},
    features: {
      tippingEnabled: true,
      membershipEnabled: true,
      rafflesEnabled: true
    },
    isActive: false // Require admin approval
  });

  // Send notification to admin
  await notifyAdmin('New creator signup', { creator });

  // Send welcome email to creator
  await sendWelcomeEmail(email, { subdomain, walletAddress });

  return NextResponse.json({
    success: true,
    message: 'Account created! Pending approval.',
    subdomain: `${subdomain}.craicprotocol.com`
  });
}
```

**C. Admin Approval Flow**
```
/admin page update:

New section: "Pending Creators"
- List creators where isActive === false
- Approve button → sets isActive: true
- Reject button → deletes creator record
```

**D. Post-Approval Onboarding Email**
```
Subject: Your CRAIC Protocol Creator Account is Active!

Body:
- Your subdomain: {subdomain}.craicprotocol.com
- Your wallet: {walletAddress} (verified)
- Admin dashboard: {subdomain}.craicprotocol.com/admin
- Next steps:
  1. Configure your first tournament
  2. Upload your logo
  3. Share your raffle link

Platform fee: 2% of all transactions
You keep: 98%

Questions? Reply to this email.
```

**Estimated Effort:** 8 hours

#### 2. Creator Dashboard Onboarding (MEDIUM - 4 hours)

**What's Needed:**

**A. First-Time Setup Wizard**
```
When creator first accesses /admin:

Step 1: Configure Tournament
- Tournament name
- Prize pool amount
- Profit share percentage
- Stream URL

Step 2: Branding
- Upload logo (optional)
- Primary color picker
- Preview card

Step 3: Payment Verification
- Display creator wallet address
- "Send test transaction" button
- Verify receipt on BaseScan
- Confirms wallet ownership

Step 4: Go Live
- Generate share link
- Copy raffle embed code
- Launch checklist
```

**B. Progress Tracker**
```
Dashboard header shows:
□ Tournament configured
□ Branding set
□ Payment verified
□ First entry received

"3 of 4 steps complete"
```

**Estimated Effort:** 4 hours

#### 3. DNS & Subdomain Setup (INFRASTRUCTURE - 2 hours)

**What's Needed:**

**A. Wildcard DNS** (Vercel)
```
*.craicprotocol.com → Vercel project

Vercel domains config:
- Add domain: craicprotocol.com
- Add wildcard: *.craicprotocol.com
- Verify DNS records
```

**B. Custom Domain Support**

For creators who want their own domain (e.g., `maxcraicpoker.com`):

```typescript
// Update middleware.ts
export function getCreatorIdFromHostname(hostname: string): string {
  // Check custom domains first (from Redis)
  const creator = await getCreatorByCustomDomain(hostname);
  if (creator) return creator.id;

  // Check subdomain
  const match = hostname.match(/^([^.]+)\.craicprotocol\.com$/);
  if (match) return `${match[1]}-poker`;

  return DEFAULT_CREATOR_ID;
}

// lib/creator-redis.ts - NEW FUNCTION
export async function getCreatorByCustomDomain(domain: string): Promise<Creator | null> {
  const creators = await getAllCreators();
  return creators.find(c => c.branding?.customDomain === domain) || null;
}
```

**Docs for Custom Domains:**
```markdown
# Using Your Own Domain

1. Go to Admin → Settings → Branding
2. Enter your domain (e.g., mypoker.com)
3. Add CNAME record: mypoker.com → cname.vercel-dns.com
4. Verify in Vercel dashboard
5. Wait for DNS propagation (up to 48h)
```

**Estimated Effort:** 2 hours (mostly waiting for DNS)

#### 4. Payment Routing Verification (HIGH - 3 hours)

**What's Needed:**

**A. Test Transaction Flow**
```
/admin/settings/verify-wallet (NEW PAGE)

1. Display creator wallet address
2. Button: "Send Test Payment"
3. Opens wallet to send 0.01 USDC to own address
4. System detects transaction on-chain
5. Shows confirmation with BaseScan link
6. Marks wallet as verified
```

**B. Wallet Verification Status**
```typescript
// Add to Creator schema:
interface Creator {
  // ...
  walletVerified: boolean;
  walletVerifiedAt?: number;
  walletVerificationTx?: string;
}

// Prevent going live until verified
if (!creator.walletVerified) {
  return NextResponse.json({
    error: 'Please verify your wallet first'
  }, { status: 400 });
}
```

**Estimated Effort:** 3 hours

---

## 3. Documentation Gap Analysis

### ✅ What Exists
- ✅ README.md (Dev setup for MCP)
- ✅ API endpoint examples (for MCP)
- ❌ **Nothing for external creators**

### ❌ What's Needed

#### 1. Creator Documentation (HIGH - 8 hours)

**A. Creator Quick Start Guide**
```markdown
# CRAIC Protocol: Creator Quick Start

## What Is CRAIC Protocol?

CRAIC is infrastructure for poker streamers to share tournament profits with their audience through on-chain raffles. Think "Patreon meets DraftKings" on Base blockchain.

## Why Use CRAIC?

- **You keep 98%** of all revenue (we take 2% platform fee)
- **Transparent & on-chain** - viewers trust the process
- **Turnkey solution** - no coding required
- **Instant settlements** - USDC on Base, pennies in fees

## How It Works

1. You stream a poker tournament
2. Viewers enter free raffle for profit share
3. You finish tournament, record profit
4. Winners automatically selected on-chain
5. USDC sent instantly to winner wallets

## Getting Started

### Step 1: Sign Up
Visit [craicprotocol.com/signup](https://craicprotocol.com/signup)

- Choose your subdomain (e.g., `yourname.craicprotocol.com`)
- Connect your Base wallet (this receives 98% of revenue)
- Submit for approval (usually 24h)

### Step 2: Configure Your First Tournament
Once approved, log into `yourname.craicprotocol.com/admin`

- Set tournament name (e.g., "GGPoker Sunday Million")
- Set buy-in amount
- Choose profit-share % (typically 5-10%)
- Set raffle deadline

### Step 3: Promote Your Raffle
Share your custom link: `yourname.craicprotocol.com`

- Twitter/X announcement
- Farcaster cast with embed
- Discord server link
- Stream overlay with QR code

### Step 4: Run Your Tournament
- Stream on Retake.tv, Twitch, or YouTube
- Play your tournament as normal
- No extra work during stream

### Step 5: Settle Results
After tournament ends:

- Go to Admin → Draw & Prizes
- Enter final profit amount
- Click "Draw Winners"
- System automatically:
  - Selects random winner(s)
  - Calculates profit share
  - Displays winner wallet addresses

### Step 6: Pay Winners
- Review winner list
- Send USDC on Base to each address
- Mark as paid (saves BaseScan link)
- Winners see proof in Payouts tab

Done! Your community now has proof you paid out.

## FAQ

**Q: What if I lose the tournament?**
A: No payout if profit is zero or negative. Viewers understand this.

**Q: Can I customize branding?**
A: Yes! Upload logo, set colors, use custom domain.

**Q: What's the platform fee?**
A: 2% of all revenue. You keep 98%.

**Q: Who pays gas fees?**
A: You pay when sending USDC. Base fees are ~$0.01 per transaction.

**Q: Can I run multiple tournaments?**
A: Yes! Configure new session after each draw.

**Q: Do viewers pay to enter?**
A: No, raffle entry is free. Revenue comes from your tournament profits.

## Support

- Email: support@craicprotocol.com
- Farcaster: @craicprotocol
- Discord: [discord.gg/craic](https://discord.gg/craic)
```

**B. Technical Integration Docs**
```markdown
# CRAIC Protocol: Technical Docs

## Architecture

CRAIC is a multi-tenant Next.js app with:
- Base L2 blockchain for payments
- Upstash Redis for state
- Subdomain-based routing
- OnchainKit for wallet UX

## Creator Data Isolation

Each creator has isolated namespace:
```
creator:{creatorId}:raffle_entries
creator:{creatorId}:raffle_winners
creator:{creatorId}:tournaments_data
creator:{creatorId}:hoth:*
creator:{creatorId}:membership:*
```

## API Endpoints

All endpoints are creator-scoped via hostname:

`POST https://yourname.craicprotocol.com/api/enter`
- Enters viewer into YOUR raffle
- Isolated from other creators

`GET https://yourname.craicprotocol.com/api/status`
- Returns YOUR tournament status
- YOUR entry count, YOUR countdown

## Custom Domain Setup

Want to use `yourpoker.com` instead of subdomain?

1. Admin → Settings → Branding → Custom Domain
2. Enter domain: `yourpoker.com`
3. Add CNAME record:
   ```
   yourpoker.com → cname.vercel-dns.com
   ```
4. Wait for verification (up to 48h)
5. Access admin at `yourpoker.com/admin`

## Webhooks (Coming Soon)

Subscribe to events:
- `raffle.entry` - New entry
- `raffle.drawn` - Winners selected
- `payment.received` - USDC received
- `payment.sent` - Payout confirmed

## Rate Limits

- Entry endpoint: 10 req/min per wallet
- Admin endpoints: 100 req/min
- Public read endpoints: 1000 req/min

## Support

Technical issues? support@craicprotocol.com
```

**C. Video Tutorials** (Optional, later)
- Screen recording: "Creating your first raffle"
- Screen recording: "Running a draw and paying winners"
- Screen recording: "Customizing your branding"

**Estimated Effort:** 8 hours (writing + screenshots)

#### 2. Business Model Documentation (MEDIUM - 2 hours)

```markdown
# CRAIC Protocol: Revenue Model

## Platform Fee Structure

CRAIC takes **2% of all revenue** that flows through the platform.

### What Counts as Revenue?

1. **Raffle Prizes** - When you pay winners their profit share
2. **Tips** - When viewers tip you during streams
3. **Memberships** - Monthly recurring subscriptions
4. **Video Tips** - Tips on VOD content

### What Doesn't Count?

- Your tournament winnings (we don't touch that)
- Gas fees
- External donations (Streamlabs, etc.)

## Example Scenarios

### Scenario 1: Simple Raffle
- You finish tournament with £1,000 profit
- Raffle winner gets 10% = £100 USDC
- **Platform fee: 2% of £100 = £2**
- **You pay: £100 to winner + £2 to platform = £102 total**
- **You keep: £898**

### Scenario 2: Multiple Revenue Streams
- Raffle payout: £100
- Tips during stream: £50
- Membership fees: £200
- **Total revenue: £350**
- **Platform fee: 2% = £7**
- **You keep: £343**

## Payment Collection

Platform fees are automatically calculated but **not automatically deducted**.

Current process:
1. System tracks all revenue
2. Calculates 2% fee
3. Shows in Admin → Revenue → "Platform Fees Owed"
4. You manually send USDC to platform wallet monthly

Future: Automatic deduction from winner payments.

## Why 2%?

- **Stripe charges 2.9% + $0.30** for traditional payments
- **Patreon takes 5-12%** of creator earnings
- **YouTube takes 30%** of memberships
- **CRAIC takes 2%** with full transparency and no censorship risk

## Custom Rates

High-volume creators (>$10k/month) can negotiate lower rates.
Contact: partnerships@craicprotocol.com

## Revenue Transparency

All platform fees are:
- Visible in real-time dashboard
- Recorded on-chain (Base blockchain)
- Auditable via BaseScan
- Reported in monthly statements

No hidden fees. Ever.
```

**Estimated Effort:** 2 hours

#### 3. Deployment Guide (LOW - 2 hours)

```markdown
# Self-Hosting CRAIC Protocol

CRAIC Protocol is open-source. You can deploy your own instance.

## Why Self-Host?

- Full control over data
- Zero platform fees
- Custom features
- White-label for your brand

## Prerequisites

- Vercel account (or any Next.js host)
- Upstash Redis account
- Custom domain
- Base wallet for payments

## 1-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/craicprotocol/craic&env=UPSTASH_REDIS_REST_URL,UPSTASH_REDIS_REST_TOKEN)

## Manual Setup

```bash
git clone https://github.com/craicprotocol/craic.git
cd craic
npm install
cp .env.example .env.local
# Edit .env.local with your values
npm run dev
```

## Environment Variables

```env
# Required
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
NEXT_PUBLIC_APP_URL=https://yoursite.com
NEXT_PUBLIC_TIP_WALLET_ADDRESS=0x...

# Optional
PLATFORM_FEE_PERCENTAGE=0  # Set to 0 for self-hosted
```

## Maintenance

- Update codebase: `git pull && npm install`
- Backup Redis: Weekly exports via Upstash dashboard
- Monitor logs: Vercel dashboard

## Support

Self-hosted installations receive community support only.

For enterprise support: enterprise@craicprotocol.com
```

**Estimated Effort:** 2 hours

---

## 4. Revenue Model Gap

### Current State (Single-Tenant)
- All payments go to `process.env.NEXT_PUBLIC_TIP_WALLET_ADDRESS`
- No platform fee collection
- No multi-wallet support
- Revenue tracking is global, not per-creator

### Target State (Protocol Model)

#### Fee Structure
- **Platform takes:** 2% of all transaction volume
- **Creator keeps:** 98%
- **Calculation:** Automatic on every transaction

#### Payment Flows

**A. Raffle Payouts**
```
Streamer owes winner £100 profit share:

1. Streamer sends £100 USDC to winner wallet
2. System records transaction
3. Platform fee owed: £2 (2% of £100)
4. Monthly invoice sent to streamer for £2
5. Streamer pays £2 to platform wallet
```

**B. Tips & Memberships**
```
Viewer tips streamer £10:

Option 1 (Current): Direct payment
- £10 USDC sent to streamer wallet
- Platform fee: £0.20 tracked, paid monthly

Option 2 (Future): Split payment
- £9.80 USDC sent to streamer wallet
- £0.20 USDC sent to platform wallet
- Automatic split via smart contract
```

#### Revenue Dashboard

**Platform Admin View:**
```
Total Volume (All Creators): £50,000
Platform Fees Earned: £1,000 (2%)

Top Creators:
1. Max Craic Poker - £25k volume, £500 fees
2. Weazel Poker - £15k volume, £300 fees
3. Other Creator - £10k volume, £200 fees

Fees Collected: £800
Fees Outstanding: £200
```

**Creator View (Individual):**
```
Your Revenue: £24,500 (98%)
Platform Fees: £500 (2%)

Breakdown:
- Raffle payouts: £20,000
- Tips: £3,000
- Memberships: £1,500

Fees Owed: £50 (due Dec 31)
Pay Now → [Button]
```

#### Implementation Strategy

**Phase 1: Manual Collection** (MVP)
- Track platform fees in Redis
- Monthly email invoices
- Manual USDC payment to platform wallet
- Estimated effort: 2 hours (already mostly done in revenue-redis.ts)

**Phase 2: Automatic Split** (Future)
- Deploy PaymentSplitter smart contract on Base
- All payments automatically split 98/2
- Zero manual invoicing
- Estimated effort: 8-12 hours (smart contract + testing)

### Missing Pieces

✅ Revenue tracking infrastructure exists
✅ Transaction recording works
❌ Per-creator revenue aggregation (needs scoping)
❌ Platform fee calculation per creator
❌ Monthly invoicing system
❌ Payment reminder emails
❌ Automatic payment splits (future)

**Estimated Effort:** 4 hours (manual collection MVP)

---

## 5. Priority Ranking & Effort Estimates

### Critical Path (Blocks First Creator)

| Task | Priority | Effort | Blocker? |
|------|----------|--------|----------|
| API endpoint migration (core raffle) | P0 | 6h | YES |
| Revenue routing implementation | P0 | 6h | YES |
| Creator wallet verification | P0 | 3h | YES |
| Self-service creator signup | P0 | 8h | YES |
| DNS wildcard subdomain setup | P0 | 2h | YES |
| **TOTAL CRITICAL PATH** | | **25h** | |

### High Priority (Launch Quality)

| Task | Priority | Effort | Notes |
|------|----------|--------|-------|
| API migration (HOTH, tips, membership) | P1 | 5h | Polish |
| Creator dashboard onboarding wizard | P1 | 4h | UX |
| Platform fee tracking & invoicing | P1 | 4h | Revenue |
| Creator documentation (quick start) | P1 | 6h | Support |
| Data isolation validation tests | P1 | 2h | Security |
| Backwards compatibility migration | P1 | 4h | Don't break MCP |
| **TOTAL HIGH PRIORITY** | | **25h** | |

### Medium Priority (Post-Launch)

| Task | Priority | Effort | Notes |
|------|----------|--------|-------|
| API migration (remaining endpoints) | P2 | 5h | Nice to have |
| Technical integration docs | P2 | 4h | Advanced users |
| Business model documentation | P2 | 2h | Transparency |
| Custom domain support docs | P2 | 2h | Premium feature |
| Deployment/self-hosting guide | P2 | 2h | Open source |
| **TOTAL MEDIUM PRIORITY** | | **15h** | |

### **Grand Total: 65 hours**

**Minimum Viable Multi-Tenant (First Creator):** 25 hours
**Production-Ready Launch:** 50 hours
**Full Feature Parity:** 65 hours

---

## 6. Roadmap to First Non-Dom Creator

### Week 1: Core Infrastructure (25 hours)
**Goal:** Make it technically possible for a second creator to exist

- [ ] **Day 1-2 (8h):** API endpoint migration
  - [ ] Migrate core raffle endpoints (enter, status, draw, reset)
  - [ ] Migrate HOTH endpoints
  - [ ] Test with dual creators in local dev

- [ ] **Day 3 (6h):** Revenue routing
  - [ ] Implement creator wallet resolution
  - [ ] Add revenue split calculation
  - [ ] Update transaction recording with creator scoping
  - [ ] Test payment flow to different wallets

- [ ] **Day 4 (8h):** Creator onboarding
  - [ ] Build /signup page
  - [ ] Create /api/signup endpoint
  - [ ] Add creator approval UI to admin
  - [ ] Implement wallet verification

- [ ] **Day 5 (3h):** Infrastructure & testing
  - [ ] Configure wildcard DNS
  - [ ] Run migration script for Max Craic data
  - [ ] End-to-end test with test creator
  - [ ] Verify data isolation

**Deliverable:** Second creator can sign up, configure tournament, run raffle independently

### Week 2: Launch Readiness (25 hours)
**Goal:** Make it production-ready and supportable

- [ ] **Day 6-7 (10h):** Documentation
  - [ ] Write creator quick start guide
  - [ ] Document API for integrations
  - [ ] Create video walkthrough (optional)
  - [ ] Write business model explainer

- [ ] **Day 8 (4h):** Creator experience polish
  - [ ] Build first-time setup wizard
  - [ ] Add progress tracking to dashboard
  - [ ] Test full creator journey

- [ ] **Day 9 (4h):** Revenue infrastructure
  - [ ] Build platform fee dashboard
  - [ ] Implement monthly invoice generation
  - [ ] Add payment tracking

- [ ] **Day 10 (7h):** QA & refinement
  - [ ] Manual QA checklist
  - [ ] Load testing with multiple creators
  - [ ] Fix bugs discovered in testing
  - [ ] Buffer for unexpected issues

**Deliverable:** Polished, documented, supportable multi-creator platform

### Week 3: Launch (15 hours)
**Goal:** Onboard first external creator

- [ ] **Day 11-12 (8h):** Beta creator onboarding
  - [ ] Recruit beta creator from network
  - [ ] Walk through signup process
  - [ ] Configure their first tournament
  - [ ] Monitor for issues

- [ ] **Day 13-15 (7h):** Support & iteration
  - [ ] Fix issues discovered by beta creator
  - [ ] Gather feedback
  - [ ] Refine documentation
  - [ ] Build feedback into product

**Deliverable:** First successful non-Dom creator running profitable raffles

---

## 7. Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data leakage between creators | Medium | CRITICAL | Comprehensive isolation tests |
| Revenue routing bug | Medium | HIGH | Payment verification step mandatory |
| Migration breaks Max Craic | Low | CRITICAL | Dual-read fallback, staged rollout |
| DNS propagation delays | High | LOW | Set expectations (24-48h), test early |
| Wallet verification bypass | Low | HIGH | Server-side validation, tx confirmation |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| No creators sign up | Medium | CRITICAL | Pre-recruit 3-5 beta creators |
| Platform fee collection fails | Medium | HIGH | Start with manual invoicing |
| First creator has bad experience | Medium | HIGH | White-glove onboarding, over-support |
| Regulatory compliance (gambling) | Low | CRITICAL | Legal review, Terms of Service |
| Bad actor creator scams users | Low | HIGH | Creator approval process, monitoring |

### Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Support volume overwhelms | High | MEDIUM | Documentation, FAQ, Discord community |
| Can't scale support | Medium | HIGH | Self-service docs, video tutorials |
| Feature requests diverge | High | MEDIUM | Product roadmap, prioritization framework |
| Infrastructure costs spike | Low | MEDIUM | Monitor Redis usage, set limits |

---

## 8. Success Metrics

### Week 1 (Infrastructure)
- [ ] 2nd creator can sign up via /signup
- [ ] 2nd creator can run independent raffle
- [ ] Zero data leakage in isolation tests
- [ ] Migration script runs without errors
- [ ] Max Craic Poker still works perfectly

### Week 2 (Launch Prep)
- [ ] Documentation complete (quick start + API docs)
- [ ] Creator onboarding <10 minutes
- [ ] Payment verification flow tested
- [ ] Platform fee tracking accurate

### Week 3 (First External Creator)
- [ ] 1 beta creator onboarded
- [ ] 1 successful raffle run by beta creator
- [ ] 1 successful payout to winner
- [ ] Zero critical bugs
- [ ] <24h response time on support

### Month 1 (Validate Model)
- [ ] 3-5 active creators
- [ ] $1,000+ total volume across platform
- [ ] 100+ total raffle entries
- [ ] 10+ successful payouts
- [ ] <5% creator churn

### Month 3 (Growth)
- [ ] 10+ active creators
- [ ] $10,000+ monthly volume
- [ ] Automated revenue splits implemented
- [ ] Self-service docs reduce support load
- [ ] Net Promoter Score >50

---

## 9. What Stays The Same (Don't Break MCP)

### Max Craic Poker Continuity

✅ **These Must Keep Working:**
- Existing raffle entries and winners
- Tournament history in tournaments.json
- All existing API endpoints
- Admin dashboard at /admin
- Mini-app at maxcraicpoker.com

✅ **Migration Strategy:**
- Dual-read fallback ensures backwards compatibility
- Migration script copies data, doesn't delete
- Gradual rollout with monitoring
- Rollback plan if anything breaks

✅ **Testing Requirements:**
- Full regression test suite for MCP
- Production smoke tests after deployment
- Monitor error rates for 7 days post-deploy

---

## 10. Open Questions

### Technical Decisions
1. **Creator approval:** Auto-approve or manual review?
   - **Recommendation:** Manual for MVP, auto-approve after 10 successful creators

2. **Platform fees:** Automatic split or manual invoicing?
   - **Recommendation:** Manual invoicing MVP, automatic split v2

3. **Creator limits:** Cap creators during beta?
   - **Recommendation:** Yes, 10 creators max for first month

4. **Redis costs:** Usage-based pricing, how to monitor?
   - **Recommendation:** Set up Upstash alerts at 80% of free tier

### Business Decisions
1. **Pricing:** Stay at 2% or introductory 0% for beta?
   - **Recommendation:** 0% for first 5 creators, then 1% for next 10, then 2%

2. **Support model:** Email only or Discord community?
   - **Recommendation:** Discord community + email for critical issues

3. **Branding:** Keep "Max Craic Poker" or rebrand to "CRAIC Protocol"?
   - **Recommendation:** Both. MCP is reference implementation, protocol is umbrella

4. **Open source:** Keep repo public or private for protocol version?
   - **Recommendation:** Public for community trust, private for premium features

---

## 11. Next Steps

### Immediate (This Week)
1. **Validate roadmap with Dom:** Is 25-hour MVP the right scope?
2. **Pre-recruit beta creators:** Line up 3-5 poker streamers interested
3. **Legal review:** Quick check on "raffle" vs "gambling" terminology
4. **Set up staging environment:** Separate Vercel project for testing

### Short Term (Next 2 Weeks)
1. **Execute Week 1 roadmap:** Core infrastructure (25 hours)
2. **Execute Week 2 roadmap:** Launch prep (25 hours)
3. **Daily standups:** Track progress, unblock issues
4. **Document decisions:** Update this doc with learnings

### Medium Term (Month 1)
1. **Onboard beta creators:** White-glove support
2. **Gather feedback:** What's confusing? What's missing?
3. **Iterate quickly:** Ship fixes and improvements weekly
4. **Build case studies:** Document success stories

---

## Appendix: File Manifest

### Files That Exist & Work
- ✅ `lib/creator-context.ts` - Creator schema, subdomain routing
- ✅ `lib/creator-redis.ts` - CRUD operations for creators
- ✅ `lib/session.ts` - Session management (supports creator param)
- ✅ `lib/revenue-redis.ts` - Transaction tracking
- ✅ `middleware.ts` - Subdomain → creatorId resolution
- ✅ `/api/super-admin/creators/route.ts` - Creator management endpoint

### Files That Need Major Updates
- 🔧 All 45 API route files (add creator scoping)
- 🔧 `lib/revenue-redis.ts` (add per-creator aggregation)
- 🔧 `public/admin.html` (add creator approval UI)

### Files To Create
- 📝 `/app/signup/page.tsx` - Creator signup page
- 📝 `/api/signup/route.ts` - Signup endpoint
- 📝 `/api/creator-wallet/route.ts` - Wallet resolution endpoint
- 📝 `lib/revenue-split.ts` - Fee calculation logic
- 📝 `scripts/migrate-to-multi-tenant.ts` - Data migration
- 📝 `tests/multi-tenant-isolation.test.ts` - Isolation tests
- 📝 `CREATOR_QUICK_START.md` - Creator documentation
- 📝 `API_DOCS.md` - Technical integration docs
- 📝 `BUSINESS_MODEL.md` - Revenue model explainer

---

**End of Gap Analysis**

*Last updated: 2025-12-18*
*Next review: After Week 1 completion*
