// Token constants (ready for when deployed)

export const TOKEN_CONFIG = {
  name: "Max Craic Poker",
  symbol: "MCP",
  decimals: 18,
  totalSupply: "1000000000", // 1 billion tokens

  // TO BE FILLED AFTER DEPLOYMENT:
  contractAddress: "", // Base mainnet contract address
  chainId: 8453, // Base
  uniswapPoolUrl: "", // Uniswap V3 pool URL
  basescanUrl: "", // Basescan token page

  // Launch info
  deployed: false,
  launchPlanned: true,
};

export const TOKENOMICS = {
  // Distribution
  communityReserve: "70-80%", // For airdrops, rewards, and community programs
  initialLiquidity: "20-30%", // Fair launch liquidity pool

  // Revenue model
  tradingFeeSplit: "1% Uniswap trading fee",
  creatorFees: "40% of 1% trading fees", // Goes to Max Craic Poker treasury

  // Utility
  utilities: [
    "Community profit-sharing rewards",
    "Live chat engagement airdrops",
    "Priority home game access",
    "Leaderboard ranking",
    "Governance rights (future)",
  ],
};

export const AIRDROP_MECHANICS = {
  liveStreamRewards: {
    enabled: true,
    description: "Active stream chat participants earn tokens during tournaments",
    mechanism: "Real-time distribution during live streams",
  },

  raffleParticipation: {
    enabled: true,
    description: "Community draw participants earn rewards",
    mechanism: "Token rewards for active participation",
  },

  leaderboardRewards: {
    enabled: true,
    description: "Monthly leaderboard rankings receive bonus allocations",
    tiers: ["Top 3: Premium rewards", "Top 10: Standard rewards", "Top 20: Base rewards"],
  },

  homeGameAccess: {
    enabled: true,
    description: "Top token holders get exclusive access to private home games",
    requirement: "Top holders by balance",
  },
};

// Helper function to check if token is deployed
export function isTokenDeployed(): boolean {
  return TOKEN_CONFIG.deployed && TOKEN_CONFIG.contractAddress !== "";
}

// Helper function to format token amount
export function formatTokenAmount(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  } else {
    return num.toFixed(2);
  }
}

// Helper function to get token URL (after deployment)
export function getTokenUrl(type: 'contract' | 'pool'): string {
  if (!isTokenDeployed()) {
    return '';
  }

  if (type === 'contract') {
    return TOKEN_CONFIG.basescanUrl;
  } else {
    return TOKEN_CONFIG.uniswapPoolUrl;
  }
}

// Placeholder function for future holder data fetching
export async function getTopHolders(): Promise<any[]> {
  // This will be implemented after token deployment
  // Will fetch from Base blockchain via RPC or indexer
  if (!isTokenDeployed()) {
    return [];
  }

  // TODO: Implement holder fetching logic
  // Options:
  // 1. Direct RPC calls to Base
  // 2. Basescan API
  // 3. The Graph protocol
  // 4. Dune Analytics API

  return [];
}
