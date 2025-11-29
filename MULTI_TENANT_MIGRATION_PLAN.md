# Multi-Tenant Data Migration Plan

**Status:** Phase 2 Foundation Complete, Data Migration Pending
**Created:** Session 32 continuation
**Estimated Effort:** 3-4 hours of careful migration work

---

## What's Already Built ✅

### Creator Infrastructure (Complete)
- ✅ `lib/creator-context.ts` - Creator interface, key helpers
- ✅ `lib/creator-redis.ts` - Creator CRUD operations
- ✅ `middleware.ts` - Hostname → creatorId detection
- ✅ `app/api/super-admin/creators/route.ts` - Creator management API
- ✅ `public/super-admin.html` - Super admin UI

### Partial Migration (lib/session.ts ONLY)
- ✅ `lib/session.ts` - Session/tournaments data now creator-scoped
  - `getTournamentsData(creatorId)`
  - `saveTournamentsData(data, creatorId)`
  - `checkAndResetSession(creatorId)`

---

## Files That Need Migration

### Priority 1: Core Data (High Impact)

#### `lib/redis.ts` (257 lines)
**Current keys:**
- `user:{wallet}` → User stats
- `user:{wallet}:daily:{date}:hand` → Daily poker hands
- `daily:{date}:hands` → Daily leaderboard
- `user:{wallet}:tickets` → Ticket accumulation
- `raffle_entries` → Draw entries
- `raffle_winners` → Draw winners

**Migration:**
- Add `creatorId` parameter to all functions (default: `DEFAULT_CREATOR_ID`)
- Wrap all keys with `getCreatorKey(creatorId, key)`
- Update: `getUserStats`, `updateUserStats`, `storeDailyHand`, etc.

**Functions to update (16 total):**
1. `getUserStats(walletAddress, creatorId?)`
2. `updateUserStats(walletAddress, drawId, creatorId?)`
3. `incrementTournamentsAssigned(walletAddress, creatorId?)`
4. `hasUserPlayedToday(walletAddress, creatorId?)`
5. `getTodayHandResult(walletAddress, creatorId?)`
6. `getUserTickets(walletAddress, creatorId?)`
7. `addUserTickets(walletAddress, amount, creatorId?)`
8. `useAllTickets(walletAddress, creatorId?)`
9. `storeDailyHand(walletAddress, creatorId?)`
10. `recalculateTodayPlacement(walletAddress, creatorId?)`
11. `clearUserDailyData(walletAddress, creatorId?)`
12. `clearTodayDailyHands(creatorId?)`
13. `getTodayPlayers(creatorId?)`

---

#### `lib/video-redis.ts` (116 lines)
**Current keys:**
- `video:{id}` → Video metadata
- `videos:all` → All video IDs
- `videos:category:{category}` → Videos by category
- `video:{id}:tips` → Video tips

**Migration:**
- Add `creatorId` parameter to all functions
- Scope all video keys to creator

**Functions to update (8 total):**
1. `createVideo(video, creatorId?)`
2. `getVideo(id, creatorId?)`
3. `getAllVideos(category?, creatorId?)`
4. `incrementViewCount(videoId, creatorId?)`
5. `addTip(tip, creatorId?)`
6. `getVideoTips(videoId, creatorId?)`
7. `deleteVideo(id, creatorId?)`

---

#### `lib/revenue-redis.ts` (307 lines)
**Current keys:**
- `membership:{wallet}` → Membership data
- `membership_settings` → Platform membership settings
- `transaction:{id}` → Transaction records
- `transactions:all` → Transaction index
- `revenue_stats` → Cached stats

**Migration:**
- Membership and transactions should be creator-scoped
- Settings should be creator-scoped (each creator sets their own price)
- Revenue stats aggregated per creator

**Functions to update (11 total):**
1. `getMembershipSettings(creatorId?)`
2. `saveMembershipSettings(settings, creatorId?)`
3. `getMembership(walletAddress, creatorId?)`
4. `createMembership(walletAddress, paymentAmount, txHash, creatorId?)`
5. `renewMembership(walletAddress, paymentAmount, txHash, creatorId?)`
6. `getActiveMembershipsCount(creatorId?)`
7. `getAllMemberships(creatorId?)`
8. `recordTransaction(transaction, creatorId?)`
9. `getTransaction(id, creatorId?)`
10. `getAllTransactions(limit, creatorId?)`
11. `getRevenueStats(creatorId?)`

---

### Priority 2: API Routes (High Impact)

All API routes that call the above functions need to:
1. Extract `creatorId` from request headers (`x-creator-id` set by middleware)
2. Pass `creatorId` to all lib function calls

**Routes to update:**

#### Raffle/Draw System
- `app/api/enter/route.ts` - Pass creatorId to getUserTickets, useAllTickets
- `app/api/draw/route.ts` - Pass creatorId to draw logic
- `app/api/admin/session/route.ts` - Pass creatorId to saveTournamentsData

#### Poker Game
- `app/api/play/route.ts` - Pass creatorId to storeDailyHand, getUserTickets
- `app/api/hand/route.ts` - Pass creatorId to getTodayHandResult

#### Videos
- `app/api/videos/route.ts` (GET/POST) - Pass creatorId to getAllVideos, createVideo
- `app/api/videos/[id]/route.ts` - Pass creatorId to getVideo, incrementViewCount
- `app/api/videos/[id]/tips/route.ts` - Pass creatorId to addTip

#### Revenue System
- `app/api/membership/status/route.ts` - Pass creatorId
- `app/api/membership/subscribe/route.ts` - Pass creatorId
- `app/api/admin/revenue/route.ts` - Pass creatorId
- `app/api/admin/revenue/export/route.ts` - Pass creatorId
- `app/api/admin/memberships/route.ts` - Pass creatorId
- `app/api/tips/leaderboard/route.ts` - Pass creatorId (if scoping tips)

**Helper pattern for routes:**
```typescript
export async function GET(request: NextRequest) {
  const creatorId = request.headers.get('x-creator-id') || DEFAULT_CREATOR_ID;

  // Use creatorId in all lib function calls
  const data = await getSomeData(creatorId);
  // ...
}
```

---

### Priority 3: Data Migration Script

**Create:** `scripts/migrate-to-multi-tenant.ts`

**Purpose:** One-time migration to move existing data to creator-scoped keys

**Steps:**
1. Read all existing keys from Redis (without creator prefix)
2. Copy each key's data to new creator-scoped key for `max-craic-poker`
3. Verify all data copied successfully
4. (Optional) Delete old keys after verification

**Example:**
```typescript
// Old: user:0x123...abc
// New: creator:max-craic-poker:user:0x123...abc

const oldKeys = await redis.keys('user:*');
for (const oldKey of oldKeys) {
  const data = await redis.hgetall(oldKey);
  const newKey = getCreatorKey(DEFAULT_CREATOR_ID, oldKey);
  await redis.hset(newKey, data);
  console.log(`Migrated: ${oldKey} → ${newKey}`);
}
```

**Keys to migrate:**
- `user:*` (user stats)
- `daily:*` (daily hands)
- `video:*` (videos)
- `videos:*` (video indexes)
- `membership:*` (memberships)
- `membership_settings` (settings)
- `transaction:*` (transactions)
- `transactions:all` (transaction index)
- `revenue_stats` (stats cache)
- `raffle_entries` (draw entries)
- `raffle_winners` (draw winners)
- `current_session_id` (session tracking)
- `tournaments_data` (already migrated in lib/session.ts)

---

## Migration Strategy Options

### Option A: Incremental Migration (Recommended)
**Time:** 3-4 hours
**Risk:** Low (backwards compatible at each step)

1. **Session 1:** Migrate `lib/redis.ts` + test
2. **Session 2:** Migrate `lib/video-redis.ts` + test
3. **Session 3:** Migrate `lib/revenue-redis.ts` + test
4. **Session 4:** Update all API routes + test
5. **Session 5:** Run migration script + verify
6. **Session 6:** Test multi-tenant functionality

**Pros:**
- Can test at each step
- Easy to rollback if issues
- Maintains backwards compatibility

**Cons:**
- Takes multiple sessions
- Slower progress

---

### Option B: Big Bang Migration
**Time:** 2-3 hours straight
**Risk:** Medium (many files changed at once)

1. Migrate all 3 lib files
2. Update all API routes
3. Run migration script
4. Test everything

**Pros:**
- Faster completion
- All changes in one commit

**Cons:**
- Harder to debug if issues
- Risk of breaking changes

---

### Option C: Skip Migration (Customer Demo First)
**Time:** 0 hours
**Risk:** None

**Rationale from BRANCH_STATUS_FINAL.md:**
> "Recommendation: Option B - prove value with YOUR instance first, then migrate to multi-tenant."

**Strategy:**
- Merge current branch to main
- Test all Phase 1 revenue features on production
- Use your instance to build case studies and demos
- Acquire first customer interest
- THEN do migration when you have a real second creator

**Pros:**
- Immediate value from Phase 1 features
- Real customer data before building multi-tenant
- Avoid premature optimization
- Focuses on revenue first

**Cons:**
- Delays multi-tenant capability
- Migration harder later with production data

---

## Backwards Compatibility Notes

All migrated functions MUST:
1. Accept optional `creatorId` parameter
2. Default to `DEFAULT_CREATOR_ID` if not provided
3. Work identically for existing single-tenant code

**Example:**
```typescript
// Old code still works
const stats = await getUserStats(walletAddress);

// New code with creator scoping
const stats = await getUserStats(walletAddress, 'weazel-poker');
```

This ensures:
- No breaking changes to existing code
- Gradual adoption of multi-tenant features
- Easy rollback if needed

---

## Testing Checklist

After migration, verify:

### Single-Tenant (max-craic-poker)
- [ ] Poker game works (daily hand, tickets)
- [ ] Raffle entry works
- [ ] Video upload/playback works
- [ ] Membership purchase works
- [ ] Tips during stream work
- [ ] Revenue dashboard shows correct data
- [ ] Admin panel works

### Multi-Tenant (test creator)
- [ ] Create second creator via super admin
- [ ] Access subdomain (e.g., test.craicprotocol.com)
- [ ] Verify data isolation (no data leakage)
- [ ] Poker game for creator #2
- [ ] Revenue tracking for creator #2
- [ ] Creator admin panel shows only their data

---

## Recommendation

Based on the status in BRANCH_STATUS_FINAL.md, I recommend **Option C: Skip Migration for Now**.

**Reasons:**
1. Phase 1 revenue features are 100% complete and ready
2. Your instance can immediately start generating revenue
3. Real customer data > theoretical multi-tenant
4. Migration is easier with clear requirements from real creators
5. Avoid over-engineering before product-market fit

**Next Steps:**
1. Merge feature branch to main
2. Test Phase 1 features thoroughly
3. Create demo materials (video, pitch deck)
4. Acquire first paying members on YOUR instance
5. Use real data for creator outreach
6. Come back to migration when you have creator #2 committed

---

## Session 32 Completion Status

**What Was Done:**
- ✅ Phase 1: 100% complete (8/8 revenue features)
- ✅ Phase 2: 50% complete (creator infrastructure + session.ts migration)
- ✅ Phase 3: 67% complete (admin panels)
- ✅ Migration plan documented

**What's Pending:**
- ⏳ Full data migration (this document)
- ⏳ API route updates (this document)
- ⏳ Migration script (this document)
- ⏳ Multi-tenant testing

**Token Usage:** ~48k/200k (24% used)

**Recommendation:** Merge and ship Phase 1, defer migration to next session.
