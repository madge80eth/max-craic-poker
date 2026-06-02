// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../contracts/CraicHomeGame.sol";

contract DeployCraicHomeGame is Script {
    function run() external {
        address signer = 0x92D65E56819d0F15177C8B3f41ae594D434f4DA0;
        address protocolWallet = 0xCc7659fbE122AcdE826725cf3a4cd5dfD72763F0;

        vm.startBroadcast();
        CraicHomeGame homeGame = new CraicHomeGame(signer, protocolWallet);
        vm.stopBroadcast();

        console.log("CraicHomeGame deployed at:", address(homeGame));
        console.log("Signer:", signer);
        console.log("Protocol wallet:", protocolWallet);
        console.log("Owner (deployer):", msg.sender);
    }
}
