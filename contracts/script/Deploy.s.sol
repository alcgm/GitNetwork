// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {RepoFactory} from "../src/RepoFactory.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        RepoFactory factory = new RepoFactory(deployer);

        vm.stopBroadcast();

        console.log("=== GitNetwork Deployment ===");
        console.log("Deployer:     ", deployer);
        console.log("RepoFactory:  ", address(factory));
        console.log("Chain ID:     ", block.chainid);

        string memory json = string(abi.encodePacked(
            '{"chainId":', vm.toString(block.chainid),
            ',"deployer":"', vm.toString(deployer),
            '","RepoFactory":"', vm.toString(address(factory)),
            '","AerodromeRouter":"0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43"',
            ',"WETH":"0x4200000000000000000000000000000000000006"}'
        ));

        vm.writeFile("deployed-addresses.json", json);
        console.log("Addresses written to deployed-addresses.json");
    }
}
