# Max Craic Poker 🎰♠️

A Web3 creator toolkit that transforms passive poker stream viewers into financially invested stakeholders through transparent profit-sharing raffles on Base.

**Live App:** [max-criac-poker.vercel.app](https://max-criac-poker.vercel.app)

---

## What This Is

Max Craic Poker (MCP) solves a real problem: **content creators need better ways to reward their communities and share success**. 

Traditional platforms take huge cuts and can change policies overnight (see: the YouTube poker apocalypse). MCP uses Base blockchain to create transparent, automated profit-sharing where:

- Streamers run poker tournaments and share profits with their audience
- Viewers enter free raffles to win real money shares
- Everything happens on-chain with verifiable transparency
- No platform can ban or censor the revenue model

### How It Works

1. **Streamer announces tournament** - Sets prize pool, share percentage, and deadline
2. **Viewers enter free raffle** - Connect wallet, enter draw, no cost
3. **Streamer plays tournament** - Live streams on Retake.tv or similar
4. **Winners selected automatically** - Random on-chain draw when tournament ends
5. **Profits shared transparently** - Winners get USDC, full transaction history visible

**Example:** Streamer finishes 2nd for £1,200 profit. Raffle winner gets 10% (£120 in USDC). All on Base for pennies in fees.

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Blockchain:** Base (Ethereum L2)
- **Wallet Integration:** OnchainKit, Wagmi, Farcaster MiniApp SDK
- **Database:** Upstash Redis (serverless)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel
- **Smart Wallet Support:** Coinbase Smart Wallet (Base Account)
- **Naming:** Basenames (.base.eth resolution)

---

## Quick Setup

### Prerequisites

- Node.js 18+ installed
- Git installed
- Upstash Redis account (free tier works)
- Base wallet with small amount of ETH (for testing)

### Installation
```bash
# Clone the repo
git clone https://github.com/yourusername/max-craic-poker.git
cd max-craic-poker

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### Environment Variables

Create `.env.local` with these variables:
```env
# Upstash Redis (get from upstash.com)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Testnet mode
NEXT_PUBLIC_TESTNET=false
```

### Run Locally
```bash
# Development server
npm run dev

# Open browser
# http://localhost:3000
```

### Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
```

---

## API Routes

The app uses Next.js API routes for raffle mechanics:

### `POST /api/enter`
Enter the current raffle draw
- **Body:** `{ address: string, isRecast: boolean }`
- **Returns:** Success/error status
- **Redis:** Stores entry in `raffle_entries` set

### `GET /api/status`
Get current raffle status
- **Returns:** Tournament details, countdown timer, user entry status
- **Redis:** Reads from `raffle_session`, `raffle_entries`, `tournament_name`

### `POST /api/draw`
Trigger winner selection (admin only)
- **Returns:** Winner address, prize amount
- **Redis:** Writes to `raffle_winners`, posts results via Neynar API

### `POST /api/reset`
Start new raffle cycle (admin only)
- **Body:** `{ maxEntries: number }`
- **Redis:** Clears entries, resets session state

### `GET /api/results`
Fetch past winners and tournament results
- **Returns:** Winner history from `tournaments.json`

---

## Project Structure
```
max-craic-poker/
├── app/
│   ├── api/              # API routes (enter, draw, status, reset)
│   ├── mini-app/         # Main Mini App page
│   ├── share/            # Social share page
│   └── admin/            # Admin controls (protected)
├── components/
│   ├── RaffleCard.tsx    # Main raffle UI
│   ├── WinnerCard.tsx    # Winner display
│   └── LeaderboardCard.tsx
├── lib/
│   ├── redis.ts          # Upstash client
│   ├── wagmi.ts          # Wallet config
│   └── session.ts        # Raffle logic
├── public/
│   └── tournaments.json  # Winner history
└── contracts/
    └── Verification.sol  # On-chain proof contract
```

---

## Raffle Mechanics

### Entry Rules
- Free to enter (no gas required)
- One entry per wallet address
- Must have Base wallet connected
- Bonus entries for recasting (optional)

### Winner Selection
- Provably random selection from Redis set
- Automatic on tournament completion
- Winners announced on-chain and via Farcaster
- Full transaction transparency

### Profit Sharing
- Base share: 5% of net profit
- Recast bonus: +5% additional
- Paid in USDC on Base (low fees)
- Instant settlement, no delays

---

## Testnet Testing

MCP supports Base Sepolia testnet for safe testing:
```env
# Enable testnet mode
NEXT_PUBLIC_TESTNET=true
```

**Get testnet ETH:**
- [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-sepolia-faucet)
- [Alchemy Faucet](https://www.alchemy.com/faucets/base-sepolia)

See `TESTNET_TESTING.md` for full guide.

---

## Base Integration

MCP is fully integrated with Base ecosystem features:

- **Basenames:** Displays `.base.eth` names instead of addresses
- **Base Account:** Supports Coinbase Smart Wallet
- **Base Chain:** All transactions on Base L2
- **Base SDK:** Uses OnchainKit for wallet interactions

See `BASE_INTEGRATION_PROOF.md` for technical details.

---

## Roadmap

### Phase 1: Prove the Model (Current)
- ✅ Working raffle system with real entries
- ✅ Cross-platform Mini App (Farcaster + Base)
- ✅ Transparent profit sharing
- 🔄 Live streaming integration (Retake.tv)
- 🔄 First successful tournament with payouts

### Phase 2: Creator Toolkit (Q1 2026)
- White-label platform for other poker creators
- Custom branding and tournament configs
- Token launch capabilities
- Revenue sharing model (% of community tokens)

### Phase 3: Ecosystem Play (Q2 2026+)
- License toolkit across poker content creators
- Onboard thousands of players to Base
- Position as go-to Web3 creator solution
- Scale beyond poker to other content verticals

---

## Why This Matters

Traditional content platforms failed poker creators:

- **YouTube policy changes** devastated revenue (90% drops for top creators)
- **Platform dependency** means one policy change kills your business
- **No community ownership** - viewers can't participate in creator success
- **High fees** - platforms take 30-50% cuts

MCP solves this with Web3:

- **Permissionless** - no platform can shut you down
- **Transparent** - all transactions verifiable on-chain
- **Community-owned** - viewers become stakeholders
- **Low cost** - Base fees are fractions of a cent

This isn't just another crypto app. It's infrastructure for the creator economy.

---

## Contributing

This is currently a solo project, but contributions welcome for:

- Bug reports and fixes
- Documentation improvements
- Feature suggestions
- Integration ideas

Open an issue or submit a PR.

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Contact

- **Twitter/X:** [@maxcraicpoker](https://twitter.com/maxcraicpoker)
- **Farcaster:** [@maxcraicpoker](https://warpcast.com/maxcraicpoker)
- **Website:** [max-criac-poker.vercel.app](https://max-criac-poker.vercel.app)

Built in Belfast, powered by Base 🚀