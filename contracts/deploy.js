// Deployment script for LeaderboardNFT contract
// This script can be used with Hardhat, Foundry, or directly with ethers.js

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🚀 Deploying LeaderboardNFT contract...\n');

  // Configuration
  const NETWORK = process.env.NETWORK || 'base'; // 'base' or 'base-sepolia'
  const PRIVATE_KEY = process.env.PRIVATE_KEY;

  if (!PRIVATE_KEY) {
    console.error('❌ Error: PRIVATE_KEY environment variable not set');
    console.log('\nUsage:');
    console.log('  PRIVATE_KEY=0x... NETWORK=base node deploy.js');
    process.exit(1);
  }

  // Network configurations
  const networks = {
    'base': {
      name: 'Base Mainnet',
      rpc: 'https://mainnet.base.org',
      chainId: 8453,
      explorer: 'https://basescan.org',
    },
    'base-sepolia': {
      name: 'Base Sepolia Testnet',
      rpc: 'https://sepolia.base.org',
      chainId: 84532,
      explorer: 'https://sepolia.basescan.org',
    },
  };

  const networkConfig = networks[NETWORK];
  if (!networkConfig) {
    console.error(`❌ Error: Unknown network "${NETWORK}"`);
    console.log('Available networks: base, base-sepolia');
    process.exit(1);
  }

  console.log(`📡 Network: ${networkConfig.name}`);
  console.log(`🔗 RPC: ${networkConfig.rpc}`);
  console.log(`🔍 Explorer: ${networkConfig.explorer}\n`);

  // Connect to network
  const provider = new ethers.JsonRpcProvider(networkConfig.rpc);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`👤 Deployer address: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    console.error('❌ Error: Insufficient balance to deploy contract');
    process.exit(1);
  }

  // Read contract source (simplified - in production use compiled bytecode)
  console.log('📝 Contract: LeaderboardNFT');
  console.log('   - Symbol: MCCV');
  console.log('   - Name: Max Craic Coaching Voucher');
  console.log('   - Standard: ERC-721\n');

  // This is a placeholder - you'll need to compile the contract first
  console.log('⚠️  IMPORTANT: This script requires compiled contract bytecode');
  console.log('   To deploy, you need to:');
  console.log('   1. Compile the contract with Hardhat or Foundry');
  console.log('   2. Use the compiled artifacts to deploy\n');

  console.log('📦 Recommended deployment methods:\n');

  console.log('Option 1: Using Hardhat');
  console.log('  npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox');
  console.log('  npx hardhat init');
  console.log('  # Add contract to contracts/');
  console.log('  npx hardhat compile');
  console.log('  npx hardhat run scripts/deploy.js --network base\n');

  console.log('Option 2: Using Foundry');
  console.log('  forge init');
  console.log('  forge install OpenZeppelin/openzeppelin-contracts');
  console.log('  forge build');
  console.log('  forge create LeaderboardNFT --rpc-url $RPC_URL --private-key $PRIVATE_KEY\n');

  console.log('Option 3: Using Remix IDE');
  console.log('  1. Go to https://remix.ethereum.org');
  console.log('  2. Create LeaderboardNFT.sol');
  console.log('  3. Compile with Solidity 0.8.20+');
  console.log('  4. Deploy to Base using Injected Provider (MetaMask)\n');

  console.log('After deployment, save the contract address:');
  console.log('  For mainnet: Add to .env as NEXT_PUBLIC_NFT_CONTRACT_ADDRESS');
  console.log('  For testnet: Add to .env.testnet as NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_TESTNET\n');

  console.log('📖 Full deployment instructions: docs/NFT_FEATURE.md\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
