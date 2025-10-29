# Max Craic Poker 🎰♠️

> Community-backed poker tournaments on Base with profit sharing and Basenames integration

[![Live on Base](https://img.shields.io/badge/Live%20on-Base-0052FF?style=for-the-badge&logo=coinbase)](https://max-craic-poker.vercel.app/mini-app)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/madge80eth/max-craic-poker)

**Built for Base Batches 002** | [View Live App →](https://max-craic-poker.vercel.app/mini-app)

---

## 🎯 What is Max Craic Poker?

Max Craic Poker is a **community-backed poker tournament platform** where users can enter a free draw to win profit shares from real poker tournaments. Winners receive their share automatically via **USDC on Base**.

### Key Features
- 🎲 **Free Entry** - No cost to enter the community draw
- 💰 **Real Prizes** - Win 4-12% profit shares from tournaments
- 🚀 **Instant Payouts** - USDC sent directly on Base
- 👤 **Basenames Integration** - See `.base.eth` names everywhere
- 🔐 **Smart Wallet Support** - Base Account enabled
- 📊 **Live Leaderboards** - Track community participation

---

## 🔗 Base Integration

### ✅ Base Batches 002 Compliance

This project fully implements Base's recommended features:

| Feature | Status | Implementation |
|---------|--------|----------------|
| **Base Chain** | ✅ Deployed | Chain ID 8453 (+ Sepolia testnet support) |
| **Basenames** | ✅ Integrated | `.base.eth` resolution via viem |
| **Base Account** | ✅ Enabled | Smart Wallet support via Coinbase Wallet |
| **Public URL** | ✅ Live | [max-craic-poker.vercel.app](https://max-craic-poker.vercel.app/mini-app) |
| **Open Source** | ✅ MIT License | Full source code available |
| **Base Transactions** | ✅ Active | Wallet: `0x849e78D6C4fB87d152d1Da384c353712E4b1c1C5` |

**📄 Detailed Proof**: See [BASE_INTEGRATION_PROOF.md](BASE_INTEGRATION_PROOF.md)

### Technical Stack

```typescript
// Base Integration
- wagmi 2.17.5 (Chain configuration)
- viem 2.37.9 (Base L2 interactions)
- @coinbase/onchainkit 0.38.19 (Wallet & Basename support)

// Frontend
- Next.js 15.4.1
- React 18.3.1
- Tailwind CSS 4.0
- Farcaster Mini App SDK

// Backend
- Upstash Redis (Entry storage)
- Next.js API Routes
```

---

## 🎥 Demo Video

**Duration**: 50 seconds
**Content**: Intro, Demo, Problem Statement, Solution, Architecture Overview

*Note: Video covers all required Base Batches 002 content in a concise format, demonstrating live Basename resolution, Smart Wallet connection, and full user flow.*

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Redis (local or Upstash)
- Base mainnet ETH (for testing)

### Installation

```bash
# Clone repository
git clone https://github.com/madge80eth/max-craic-poker.git
cd max-craic-poker

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Add your Redis credentials

# Run development server
npm run dev
```

Open [http://localhost:3000/mini-app](http://localhost:3000/mini-app)

### Testnet Mode

```bash
# Run on Base Sepolia testnet
cp .env.testnet .env.local
npm run dev
```

See [TESTNET_TESTING.md](TESTNET_TESTING.md) for full testnet guide.

---

## 📁 Project Structure

```
max-craic-poker/
├── app/
│   ├── mini-app/
│   │   ├── components/
│   │   │   └── WalletDisplay.tsx      # Basename display component
│   │   ├── hooks/
│   │   │   └── useBasename.ts         # Basename resolution hook
│   │   ├── page.tsx                   # Main Mini App UI
│   │   └── providers.tsx              # Wagmi + Base config
│   ├── api/
│   │   ├── enter/                     # Entry endpoint
│   │   ├── draw/                      # Winner selection
│   │   ├── status/                    # User status check
│   │   └── leaderboard/               # Rankings
│   └── share/                         # Social sharing frame
├── contracts/
│   └── Verification.sol               # On-chain verification contract
├── lib/
│   ├── redis.ts                       # Database client
│   └── session.ts                     # Session management
└── public/
    └── .well-known/
        └── farcaster.json             # Farcaster Mini App config
```

---

## 🎮 How It Works

### For Users
1. **Connect Wallet** → Smart Wallet or EOA on Base
2. **Enter Draw** → Free entry, no transaction required
3. **Get Selected** → 3 winners chosen randomly before each stream
4. **Earn Profit** → If tournament cashes, receive USDC share on Base

### Profit Share Structure
- 🥇 **1st Place**: 6% (12% if shared on Farcaster)
- 🥈 **2nd Place**: 5% (10% if shared)
- 🥉 **3rd Place**: 4% (8% if shared)

### Basenames in Action
All wallet addresses automatically resolve to `.base.eth` names:
- Winner announcements
- Leaderboard entries
- Connected wallet display

---

## 🔧 Base-Specific Features

### 1. Basename Resolution
**File**: [`app/mini-app/hooks/useBasename.ts`](app/mini-app/hooks/useBasename.ts)

```typescript
// Resolves Base names on L2
const client = createPublicClient({
  chain: activeChain,
  transport: http(),
});

const ensName = await client.getEnsName({
  address: address as `0x${string}`,
});
```

### 2. Smart Wallet Support
**File**: [`app/mini-app/providers.tsx`](app/mini-app/providers.tsx)

```typescript
coinbaseWallet({
  appName: 'Max Craic Poker',
  preference: 'smartWalletOnly', // Base Account
})
```

### 3. Dual Chain Support
Supports both Base mainnet and Base Sepolia testnet via environment variable:

```typescript
const isTestnet = process.env.NEXT_PUBLIC_TESTNET === 'true'
const activeChain = isTestnet ? baseSepolia : base
```

---

## 📊 BaseScan Verification

**Application Wallet**: [`0x849e78D6C4fB87d152d1Da384c353712E4b1c1C5`](https://basescan.org/address/0x849e78D6C4fB87d152d1Da384c353712E4b1c1C5)

View all Base transactions and activity on BaseScan.

---

## 🧪 Testing

### Manual Testing
```bash
npm run dev
# Visit http://localhost:3000/mini-app
# Connect wallet to Base Sepolia
# Test entry flow
```

### Build & Type Check
```bash
npm run build
npm run lint
```

---

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🤝 Contributing

This project was built for Base Batches 002. Contributions welcome!

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 🔗 Links

- **Live App**: https://max-craic-poker.vercel.app/mini-app
- **GitHub**: https://github.com/madge80eth/max-craic-poker
- **Farcaster**: [@maxcraicpoker](https://warpcast.com/maxcraicpoker)
- **Base Profile**: [BaseScan](https://basescan.org/address/0x849e78D6C4fB87d152d1Da384c353712E4b1c1C5)

---

## 📞 Support

For issues or questions:
- Open a [GitHub Issue](https://github.com/madge80eth/max-craic-poker/issues)
- Contact on Farcaster: [@maxcraicpoker](https://warpcast.com/maxcraicpoker)

---

**Built with ❤️ on Base** | Base Batches 002 Submission
