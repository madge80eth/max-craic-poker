# Automated Tournament Timeline

## Complete Automation Flow

All tournament operations are **fully automated** via Vercel cron job running every minute.

---

## Timeline (Example: Stream at 11:00am)

### 10:00am - Draw & Registration Opens
**Triggered by:** Cron job detects it's 1 hour before stream start

**Actions:**
1. Raffle draw executes (existing `/api/draw` logic)
2. Winners selected and assigned tournaments
3. **Tournament created automatically:**
   - Tournament ID: ISO timestamp of 10:30am
   - Registration opens immediately
   - All raffle entrants auto-registered
   - Status: `registration`

**User sees:**
- Draw results with 6 winners
- "Community Game" tab becomes active
- Registration countdown: "Starts in 30 minutes"

---

### 10:00am - 10:30am - Registration Period
**Duration:** 30 minutes

**What happens:**
- Players can view tournament details
- See who else is registered
- Cannot join if not a raffle entrant (auto-populated)
- Countdown ticks down to start

**API endpoints active:**
- `GET /api/game/join` - Check registration status
- `GET /api/game/state` - View tournament details

---

### 10:30am - Tournament Auto-Starts
**Triggered by:** Cron job detects `now >= startTime`

**Actions:**
1. Tournament status changes to `active`
2. All registered players seated (up to 6 max)
3. Blinds posted (SB/BB)
4. Hole cards dealt (stored privately in Redis)
5. **3-minute "Deal Me In" deadline set**
6. Hand #1 begins

**User sees:**
- Poker table appears
- Seat assignments shown
- **BIG PROMPT: "Deal Me In" button**
- Countdown: "3:00 remaining to confirm"

**State:**
```json
{
  "status": "active",
  "currentHandNumber": 1,
  "dealMeInDeadline": 1732104180000,  // 3 mins from start
  "players": [ /* all seated */ ]
}
```

---

### 10:30am - 10:33am - CRITICAL: Initial "Deal Me In" Window
**Duration:** 3 minutes
**Rule:** Click "Deal Me In" or get disqualified

**What happens:**
- Players must click "Deal Me In" button
- Button click calls `POST /api/game/deal-me-in`
- Recorded in Redis: `tournament:dealin:{id}:1`
- Failure to click = automatic DQ

**10:33am - DQ Check:**
Cron job runs:
```javascript
if (now >= dealMeInDeadline) {
  const dealedIn = getDealedInPlayers(tournamentId, 1)

  for (player of players) {
    if (!dealedIn.includes(player.wallet)) {
      player.status = 'eliminated'
      player.missedHands = 3  // Max out
    }
  }
}
```

**Players who didn't click:**
- Status → `eliminated`
- Chips stay at table (shown as "sitting-out")
- Cannot re-enter

---

### 10:33am - 11:00am - Tournament Plays Out
**Duration:** 27 minutes remaining

**Ongoing "Deal Me In" System:**
- **Before each hand:** Button appears 30 seconds before dealing
- Players have 30 seconds to click
- Miss 1 hand: `missedHands` increments
- Miss 3 hands total: Auto-DQ

**Hand flow:**
1. Button appears: "Deal Me In for next hand?"
2. 30 seconds to click
3. Cron checks who clicked
4. Players who clicked get dealt cards
5. Players who didn't: `missedHands++`
6. If `missedHands >= 3`: Status → `eliminated`

**State updates:**
- Blinds increase every 5 minutes (cron job)
- Players eliminated when chips = 0
- Side pots created for all-ins
- Tournament ends when 3 players remain

---

### 11:00am - Stream Starts, Tournament Completes
**Triggered by:** 3 players remaining

**Actions:**
1. Final hand plays out
2. Winners determined (1st/2nd/3rd)
3. **Prizes awarded:**
   - 1st place: Cash prize + 5% equity in games 3-6
   - 2nd place: Cash prize + 5% equity in games 3-6
   - 3rd place: Cash prize + 5% equity in games 3-6
4. Results stored in Redis
5. Status → `completed`

**Total winners displayed:**
- **3 raffle winners** (from 10:00am draw)
- **3 tournament winners** (from poker game)
- **= 6 total winners**

---

## Cron Job Responsibilities

**File:** `app/api/cron/check-tournament/route.ts`
**Runs:** Every 1 minute
**Protected by:** `CRON_SECRET` env var

**Checks performed:**
1. **Tournament creation** (at draw time - 1hr before stream)
2. **Tournament start** (30 mins before stream)
3. **Initial "Deal Me In" DQ** (3 mins after start)
4. **Blind increases** (every 5 minutes)
5. **Hand-by-hand DQ checks** (miss 3 hands rule)

---

## Environment Variables Required

```env
# Existing
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# New for cron authentication
CRON_SECRET=your-random-secret-here
```

**Generate CRON_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## User Experience Summary

**No manual intervention required!**

| Time | User Sees | Action Required |
|------|-----------|-----------------|
| 10:00am | Draw results, tournament registered | None (automatic) |
| 10:00-10:30 | Registration countdown | None (already registered) |
| 10:30am | Tournament starts, "Deal Me In" prompt | **CLICK BUTTON** (3 min deadline) |
| 10:33am | DQ check runs | None (automated) |
| 10:33-11:00 | Game plays, periodic "Deal Me In" | Click before each hand |
| 11:00am | Tournament ends, winners shown | None (results automatic) |

---

## API Endpoints (User-Facing)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/game/state` | GET | View tournament state |
| `/api/game/join` | GET | Check registration status |
| `/api/game/deal-me-in` | POST | Confirm presence for hand |
| `/api/game/deal-me-in?wallet=...` | GET | Check if confirmed |

**Admin/Testing Only:**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/game/create` | POST | Manual tournament creation |
| `/api/game/start` | POST | Manual tournament start |
| `/api/cron/check-tournament` | GET | Cron job (Vercel only) |

---

## Testing the Automation

**Option 1: Wait for Real Schedule**
- Set `streamStartTime` in `tournaments.json`
- Wait for cron to execute

**Option 2: Manual Testing**
```bash
# Set streamStartTime to 1 hour from now
# Create tournament manually
POST /api/game/create

# Start tournament manually
POST /api/game/start

# Simulate "Deal Me In"
POST /api/game/deal-me-in
{
  "walletAddress": "0x123..."
}
```

---

## Redis Keys Used

| Key | Purpose | TTL |
|-----|---------|-----|
| `tournament:config:{id}` | Tournament settings | 24h |
| `tournament:state:{id}` | Live game state | 24h |
| `tournament:registrations:{id}` | Registered wallets | 24h |
| `tournament:dealin:{id}:{hand}` | Hand confirmation tracking | 10m |
| `tournament:cards:{id}:{wallet}` | Private hole cards | 1h |
| `tournament:active` | Current tournament ID | Permanent |
| `tournament:results:{id}` | Final results | 30d |

---

## Fail-Safes

**What if cron misses a minute?**
- Cron runs every minute, catches up on next run
- Checks use timestamps, not sequential execution

**What if no one clicks "Deal Me In"?**
- Everyone gets DQ'd after 3 minutes
- Tournament ends (needs minimum 2 players)

**What if player disconnects?**
- Chips stay at table
- `missedHands` increments each hand
- Auto-DQ after 3 missed hands

**What if tournament runs over 30 minutes?**
- Blind schedule aggressive (turbo format)
- 7 blind levels designed for 30-min completion
- If goes long, continues until 3 players remain
