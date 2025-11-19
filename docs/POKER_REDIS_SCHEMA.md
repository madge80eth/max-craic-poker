# Poker Tournament Redis Schema

**Namespace Prefix:** `tournament:` (to avoid conflicts with raffle system)

## Free Tier Optimization Strategy

- **Upstash Free Tier Limit:** 10,000 commands/day
- **Tournament Duration:** 30 minutes (turbo format)
- **Max Players:** 6 (6-max format)
- **Polling Strategy:** 2-second intervals (smart polling)
- **Estimated Usage:** ~5,400 commands per tournament (safe margin)

---

## Redis Keys Reference

### 1. Tournament Configuration

```
Key: tournament:config:{tournamentId}
Type: String (JSON)
TTL: 24 hours
Schema: TournamentConfig
```

Example:
```json
{
  "tournamentId": "2025-11-20T10:00:00Z",
  "startTime": 1732104000000,
  "registrationEndsAt": 1732102200000,
  "smallBlind": 10,
  "bigBlind": 20,
  "startingChips": 1000,
  "blindIncreaseInterval": 300000,
  "actionTimeout": 30000,
  "maxPlayers": 6
}
```

---

### 2. Tournament Game State (PRIMARY KEY)

```
Key: tournament:state:{tournamentId}
Type: String (JSON)
TTL: 24 hours
Schema: GameState
```

This is the **single source of truth** for all game state. Updated on every action.

Example:
```json
{
  "tournamentId": "2025-11-20T10:00:00Z",
  "status": "active",
  "currentHandNumber": 5,
  "dealerPosition": 3,
  "smallBlindPosition": 4,
  "bigBlindPosition": 5,
  "currentBlindLevel": 1,
  "smallBlind": 10,
  "bigBlind": 20,
  "pot": 450,
  "communityCards": ["Ah", "Kd", "3c"],
  "currentBettingRound": "flop",
  "activePlayerPosition": 6,
  "players": [
    {
      "walletAddress": "0x123...",
      "seatPosition": 1,
      "chipStack": 850,
      "status": "active",
      "missedHands": 0,
      "isDealer": false,
      "isSmallBlind": false,
      "isBigBlind": false,
      "currentBet": 50,
      "totalBetThisRound": 50,
      "cards": [],
      "lastAction": "call"
    }
  ],
  "sidePots": [],
  "lastUpdate": 1732104567890
}
```

---

### 3. Player Registrations

```
Key: tournament:registrations:{tournamentId}
Type: Set
TTL: 24 hours
Members: Wallet addresses
```

Stores all registered players. Auto-populated from raffle entrants.

```
SADD tournament:registrations:2025-11-20T10:00:00Z "0x123..."
SMEMBERS tournament:registrations:2025-11-20T10:00:00Z
```

---

### 4. Player Cards (Private)

```
Key: tournament:cards:{tournamentId}:{walletAddress}
Type: String (JSON)
TTL: 1 hour
Schema: string[]
```

Stores each player's hole cards privately (not in main state).

```json
["Ah", "Kd"]
```

---

### 5. Active Tournament ID

```
Key: tournament:active
Type: String
TTL: None (persistent)
Value: tournamentId of currently active/upcoming tournament
```

Used to quickly find the current tournament without scanning.

```
SET tournament:active "2025-11-20T10:00:00Z"
```

---

### 6. Tournament Results

```
Key: tournament:results:{tournamentId}
Type: String (JSON)
TTL: 30 days
Schema: TournamentResult
```

Stores final results for completed tournaments.

```json
{
  "tournamentId": "2025-11-20T10:00:00Z",
  "completedAt": 1732106400000,
  "winners": [
    {
      "walletAddress": "0x123...",
      "position": 1,
      "prizeAmount": 50,
      "equityPercentage": 5
    },
    {
      "walletAddress": "0x456...",
      "position": 2,
      "prizeAmount": 30,
      "equityPercentage": 5
    },
    {
      "walletAddress": "0x789...",
      "position": 3,
      "prizeAmount": 20,
      "equityPercentage": 5
    }
  ]
}
```

---

### 7. Deal Me In Tracking

```
Key: tournament:dealin:{tournamentId}:{handNumber}
Type: Set
TTL: 10 minutes
Members: Wallet addresses who clicked "Deal Me In"
```

Tracks which players confirmed presence for current hand.

```
SADD tournament:dealin:2025-11-20T10:00:00Z:5 "0x123..."
SISMEMBER tournament:dealin:2025-11-20T10:00:00Z:5 "0x123..."
```

---

## Redis Command Count Optimization

### Smart Polling Pattern

**Client-Side Polling:**
```javascript
// Poll every 2 seconds during active play
setInterval(async () => {
  const state = await fetch('/api/game/state?tournamentId=...')
}, 2000)
```

**Cost Calculation:**
- 1 poll = 1 GET command to Redis
- 6 players × 0.5 polls/second × 1800 seconds = ~5,400 commands
- Well under 10K/day limit ✅

### Aggressive Caching

**API Route Pattern:**
```typescript
// Cache state for 1 second to reduce Redis hits
let cachedState = null
let cacheTime = 0

export async function GET(req) {
  const now = Date.now()
  if (cachedState && now - cacheTime < 1000) {
    return Response.json(cachedState) // No Redis call
  }

  const state = await redis.get(`tournament:state:${id}`)
  cachedState = state
  cacheTime = now
  return Response.json(state)
}
```

This reduces 9 simultaneous requests to 1 Redis command per second.

---

## Session 4-6: Redis Pub/Sub Keys (Future)

```
Channel: tournament:updates:{tournamentId}
Type: Pub/Sub channel
Purpose: Real-time state broadcasts (Session 4)
```

Published messages:
```json
{
  "type": "state_update",
  "tournamentId": "2025-11-20T10:00:00Z",
  "state": { /* full GameState */ }
}
```

Server-Sent Events (SSE) endpoint will subscribe to this channel.

---

## Data Flow Example

### Player Takes Action

1. POST `/api/game/action` with `{ action: 'call', amount: 50 }`
2. Server validates action against current state
3. Server updates `tournament:state:{id}` with new state
4. Server publishes to `tournament:updates:{id}` channel (Session 4+)
5. All SSE clients receive update instantly

### Hand Completion

1. Server detects betting round complete
2. Deal next cards (flop/turn/river)
3. Update `tournament:state:{id}`
4. Publish update
5. If hand complete, evaluate winner using pokersolver
6. Distribute pot, update chip stacks
7. Increment `currentHandNumber`
8. Clear `tournament:dealin:{id}:{handNumber-1}`

---

## Key Expiration Strategy

| Key Pattern | TTL | Reason |
|-------------|-----|--------|
| `tournament:config:*` | 24h | Config only needed day-of |
| `tournament:state:*` | 24h | Game state only needed day-of |
| `tournament:registrations:*` | 24h | Registration data only needed day-of |
| `tournament:cards:*` | 1h | Hole cards only needed during tournament |
| `tournament:dealin:*` | 10m | "Deal Me In" resets each hand |
| `tournament:results:*` | 30d | Keep results for historical tracking |
| `tournament:active` | None | Always need current tournament reference |

**Total Storage:** ~50KB per tournament (well under free tier limits)

---

## Sessions 1-3 Implementation

**Session 1:** ✅ Define all types and Redis keys (this document)
**Session 2:** Build `/api/game/state` and `/api/game/join` endpoints
**Session 3:** Implement poker hand evaluation with pokersolver

**Next:** Sessions 4-6 will add Redis Pub/Sub + SSE for real-time updates.
