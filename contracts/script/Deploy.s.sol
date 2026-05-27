// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {RepoFactory} from "../src/RepoFactory.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        address deployer = msg.sender;
        RepoFactory factory = new RepoFactory(deployer);

        vm.stopBroadcast();

        console.log("=== GitNetwork Deployment ===");
        console.log("Deployer:        ", deployer);
        console.log("RepoFactory:     ", address(factory));
        console.log("Chain ID:        ", block.chainid);
        console.log("AerodromeRouter: 0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43");
        console.log("WETH:            0x4200000000000000000000000000000000000006");
    }
}
