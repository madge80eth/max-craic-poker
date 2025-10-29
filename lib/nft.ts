import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { base, baseSepolia } from 'viem/chains';

// Contract ABI for LeaderboardNFT
export const LEADERBOARD_NFT_ABI = parseAbi([
  'function mintLeaderboardNFT(address to, string memory month, uint256 rank, string memory uri) public returns (uint256)',
  'function hasClaimedForMonth(address wallet, string memory month) public view returns (bool)',
  'function markCoachingUsed(uint256 tokenId) public',
  'function getTokenInfo(uint256 tokenId) public view returns (string memory month, uint256 rank, bool used)',
  'function tokensOfOwner(address owner) public view returns (uint256[] memory)',
  'function ownerOf(uint256 tokenId) public view returns (address)',
  'function tokenURI(uint256 tokenId) public view returns (string memory)',
  'event NFTClaimed(address indexed wallet, uint256 indexed tokenId, string month, uint256 rank)',
]);

// Contract address (update after deployment)
export const LEADERBOARD_NFT_CONTRACT = {
  mainnet: process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  testnet: process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_TESTNET || '0x0000000000000000000000000000000000000000',
};

// Get the active chain and contract address
export function getActiveNFTContract(isTestnet: boolean = false) {
  return isTestnet ? LEADERBOARD_NFT_CONTRACT.testnet : LEADERBOARD_NFT_CONTRACT.mainnet;
}

export function getActiveChain(isTestnet: boolean = false) {
  return isTestnet ? baseSepolia : base;
}

// NFT Metadata structure
export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

// Generate NFT metadata based on rank and month
export function generateNFTMetadata(rank: number, month: string): NFTMetadata {
  const rankNames = ['Champion', 'Runner-Up', 'Third Place', 'Top 5', 'Top 5'];
  const rankName = rankNames[rank - 1] || 'Participant';

  const rankEmojis = ['🥇', '🥈', '🥉', '🏆', '🏆'];
  const rankEmoji = rankEmojis[rank - 1] || '🎯';

  // Format month for display (e.g., "2025-10" -> "October 2025")
  const [year, monthNum] = month.split('-');
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = monthNames[parseInt(monthNum) - 1];
  const displayMonth = `${monthName} ${year}`;

  return {
    name: `Max Craic Coaching Voucher - ${rankName}`,
    description: `${rankEmoji} Congratulations! You ranked #${rank} on the Max Craic Poker leaderboard for ${displayMonth}. This NFT entitles you to one free hour of poker coaching with Max Craic. Claim your session and level up your game!`,
    image: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://max-craic-poker.vercel.app'}/nft/${rank}.png`,
    attributes: [
      {
        trait_type: 'Rank',
        value: rank,
      },
      {
        trait_type: 'Month',
        value: displayMonth,
      },
      {
        trait_type: 'Type',
        value: 'Coaching Voucher',
      },
      {
        trait_type: 'Duration',
        value: '1 Hour',
      },
      {
        trait_type: 'Tier',
        value: rankName,
      },
    ],
  };
}

// Get current month in YYYY-MM format
export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Get previous month in YYYY-MM format
export function getPreviousMonth(monthsAgo: number = 1): string {
  const now = new Date();
  now.setMonth(now.getMonth() - monthsAgo);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Format month for display
export function formatMonth(month: string): string {
  const [year, monthNum] = month.split('-');
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = monthNames[parseInt(monthNum) - 1];
  return `${monthName} ${year}`;
}

// Check if a month is within the claim window (until end of following month)
export function isWithinClaimWindow(leaderboardMonth: string): boolean {
  const [year, month] = leaderboardMonth.split('-').map(Number);

  // Calculate the last day of the following month
  const followingMonth = new Date(year, month, 0); // Last day of following month
  followingMonth.setMonth(followingMonth.getMonth() + 1);
  followingMonth.setHours(23, 59, 59, 999);

  const now = new Date();
  return now <= followingMonth;
}

// Generate claim deadline text
export function getClaimDeadline(leaderboardMonth: string): string {
  const [year, month] = leaderboardMonth.split('-').map(Number);

  // Last day of the following month
  const deadline = new Date(year, month, 0);
  deadline.setMonth(deadline.getMonth() + 1);

  return deadline.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Create a public client for reading contract data
export function createNFTPublicClient(isTestnet: boolean = false) {
  const chain = getActiveChain(isTestnet);

  return createPublicClient({
    chain,
    transport: http(),
  });
}

// Check if wallet has claimed NFT for a specific month
export async function hasClaimedNFT(
  walletAddress: string,
  month: string,
  isTestnet: boolean = false
): Promise<boolean> {
  const client = createNFTPublicClient(isTestnet);
  const contractAddress = getActiveNFTContract(isTestnet);

  try {
    const hasClaimed = await client.readContract({
      address: contractAddress as `0x${string}`,
      abi: LEADERBOARD_NFT_ABI,
      functionName: 'hasClaimedForMonth',
      args: [walletAddress as `0x${string}`, month],
    });

    return hasClaimed as boolean;
  } catch (error) {
    console.error('Error checking NFT claim status:', error);
    return false;
  }
}

// Get all NFTs owned by a wallet
export async function getWalletNFTs(
  walletAddress: string,
  isTestnet: boolean = false
): Promise<number[]> {
  const client = createNFTPublicClient(isTestnet);
  const contractAddress = getActiveNFTContract(isTestnet);

  try {
    const tokens = await client.readContract({
      address: contractAddress as `0x${string}`,
      abi: LEADERBOARD_NFT_ABI,
      functionName: 'tokensOfOwner',
      args: [walletAddress as `0x${string}`],
    }) as bigint[];

    return tokens.map(t => Number(t));
  } catch (error) {
    console.error('Error fetching wallet NFTs:', error);
    return [];
  }
}

// Get token info
export async function getTokenInfo(
  tokenId: number,
  isTestnet: boolean = false
): Promise<{ month: string; rank: number; used: boolean } | null> {
  const client = createNFTPublicClient(isTestnet);
  const contractAddress = getActiveNFTContract(isTestnet);

  try {
    const info = await client.readContract({
      address: contractAddress as `0x${string}`,
      abi: LEADERBOARD_NFT_ABI,
      functionName: 'getTokenInfo',
      args: [BigInt(tokenId)],
    }) as [string, bigint, boolean];

    return {
      month: info[0],
      rank: Number(info[1]),
      used: info[2],
    };
  } catch (error) {
    console.error('Error fetching token info:', error);
    return null;
  }
}
