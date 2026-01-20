// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/CraicTournament.sol";

/**
 * @title DeployCraicTournament
 * @notice Deployment script for CraicTournament contract on Base mainnet
 *
 * Usage:
 * 1. Set environment variables:
 *    - DEPLOYER_PRIVATE_KEY: Private key for deployer wallet
 *    - BASE_RPC_URL: Base mainnet RPC URL (e.g., from Alchemy/Infura)
 *    - GAME_SERVER_ADDRESS: Address that can call finishTournament
 *    - BASESCAN_API_KEY: For contract verification
 *
 * 2. Run deployment:
 *    forge script script/DeployCraicTournament.s.sol:DeployCraicTournament \
 *      --rpc-url base \
 *      --broadcast \
 *      --verify \
 *      -vvvv
 *
 * 3. After deployment, add the contract address to .env.local:
 *    NEXT_PUBLIC_CRAIC_CONTRACT_ADDRESS=<deployed_address>
 */
contract DeployCraicTournament is Script {
    // Base mainnet USDC address
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    function run() external {
        // Get deployment parameters from environment
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address gameServer = vm.envAddress("GAME_SERVER_ADDRESS");

        require(gameServer != address(0), "GAME_SERVER_ADDRESS not set");

        console.log("Deploying CraicTournament...");
        console.log("USDC address:", USDC_BASE);
        console.log("Game server:", gameServer);

        vm.startBroadcast(deployerPrivateKey);

        CraicTournament tournament = new CraicTournament(
            USDC_BASE,
            gameServer
        );

        vm.stopBroadcast();

        console.log("CraicTournament deployed to:", address(tournament));
        console.log("");
        console.log("Add to .env.local:");
        console.log("NEXT_PUBLIC_CRAIC_CONTRACT_ADDRESS=", address(tournament));
    }
}
