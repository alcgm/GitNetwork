// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {RepoFactory} from "../src/RepoFactory.sol";
import {RepoToken} from "../src/RepoToken.sol";
import {ContributorVesting} from "../src/ContributorVesting.sol";

contract RepoFactoryTest is Test {
    RepoFactory public factory;
    address public owner;
    address public contributor1;
    address public contributor2;
    address public user;

    bytes32 constant REPO_DID = keccak256("did:gitlawb:test-repo");
    uint256 constant TOTAL_SUPPLY = 1_000_000 ether;
    uint256 constant LAUNCH_FEE = 0.005 ether;

    function setUp() public {
        owner = makeAddr("owner");
        contributor1 = makeAddr("contributor1");
        contributor2 = makeAddr("contributor2");
        user = makeAddr("user");

        vm.prank(owner);
        factory = new RepoFactory(owner);

        vm.deal(user, 10 ether);
    }

    function test_LaunchRepoToken_Basic() public {
        address[] memory contributors = new address[](2);
        contributors[0] = contributor1;
        contributors[1] = contributor2;

        uint256[] memory shares = new uint256[](2);
        shares[0] = 2000;
        shares[1] = 2000;

        vm.prank(user);
        address tokenAddr = factory.launchRepoToken{value: LAUNCH_FEE}(
            REPO_DID,
            "https://gitlawb.com/test-repo",
            "Test Token",
            "TEST",
            TOTAL_SUPPLY,
            contributors,
            shares,
            30 days,
            180 days,
            2000
        );

        assertNotEq(tokenAddr, address(0));
        assertEq(factory.getToken(REPO_DID), tokenAddr);

        RepoToken token = RepoToken(tokenAddr);
        assertEq(token.name(), "Test Token");
        assertEq(token.symbol(), "TEST");
        assertEq(token.repoDID(), REPO_DID);
    }

    function test_LaunchRepoToken_ProtocolFee() public {
        address[] memory contributors = new address[](0);
        uint256[] memory shares = new uint256[](0);

        uint256 ownerBalBefore = owner.balance;

        vm.prank(user);
        factory.launchRepoToken{value: LAUNCH_FEE}(
            REPO_DID,
            "https://gitlawb.com/test-repo",
            "Test Token",
            "TEST",
            TOTAL_SUPPLY,
            contributors,
            shares,
            0,
            0,
            0
        );

        assertEq(owner.balance, ownerBalBefore + LAUNCH_FEE);
    }

    function test_LaunchRepoToken_ProtocolTokenShare() public {
        address[] memory contributors = new address[](0);
        uint256[] memory shares = new uint256[](0);

        vm.prank(user);
        address tokenAddr = factory.launchRepoToken{value: LAUNCH_FEE}(
            REPO_DID,
            "https://gitlawb.com/test-repo",
            "Test Token",
            "TEST",
            TOTAL_SUPPLY,
            contributors,
            shares,
            0,
            0,
            0
        );

        RepoToken token = RepoToken(tokenAddr);
        uint256 expectedProtocol = (TOTAL_SUPPLY * 1000) / 10000;
        assertEq(token.balanceOf(owner), expectedProtocol);
    }

    function test_RevertDuplicateLaunch() public {
        address[] memory contributors = new address[](0);
        uint256[] memory shares = new uint256[](0);

        vm.startPrank(user);
        factory.launchRepoToken{value: LAUNCH_FEE}(
            REPO_DID, "", "Test", "TEST", TOTAL_SUPPLY, contributors, shares, 0, 0, 0
        );

        vm.expectRevert("RepoFactory: already launched");
        factory.launchRepoToken{value: LAUNCH_FEE}(
            REPO_DID, "", "Test2", "TEST2", TOTAL_SUPPLY, contributors, shares, 0, 0, 0
        );
        vm.stopPrank();
    }

    function test_RevertInsufficientFee() public {
        address[] memory contributors = new address[](0);
        uint256[] memory shares = new uint256[](0);

        vm.prank(user);
        vm.expectRevert("RepoFactory: insufficient fee");
        factory.launchRepoToken{value: 0.001 ether}(
            REPO_DID, "", "Test", "TEST", TOTAL_SUPPLY, contributors, shares, 0, 0, 0
        );
    }

    function test_RevertExceedMaxBps() public {
        address[] memory contributors = new address[](1);
        contributors[0] = contributor1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 8500;

        vm.prank(user);
        vm.expectRevert("RepoFactory: exceeds max contributor bps");
        factory.launchRepoToken{value: LAUNCH_FEE}(
            REPO_DID, "", "Test", "TEST", TOTAL_SUPPLY, contributors, shares, 0, 0, 2000
        );
    }

    function test_ContributorVesting_Claim() public {
        address[] memory contributors = new address[](1);
        contributors[0] = contributor1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 3000;

        vm.prank(user);
        address tokenAddr = factory.launchRepoToken{value: LAUNCH_FEE}(
            REPO_DID, "", "Test", "TEST", TOTAL_SUPPLY,
            contributors, shares, 0, 365 days, 0
        );

        (, , , , , address vestingAddr, ) = abi.decode(
            abi.encode(address(0), address(0), address(0), address(0), address(0), address(0), address(0)),
            (address, address, address, address, address, address, address)
        );

        RepoToken token = RepoToken(tokenAddr);
        uint256 expectedContrib = (TOTAL_SUPPLY * 3000) / 10000;

        vm.warp(block.timestamp + 365 days / 2);
        ContributorVesting vesting;

        address[] memory cs = new address[](1);
        cs[0] = contributor1;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = expectedContrib;

        vesting = new ContributorVesting(tokenAddr, cs, amounts, 0, 365 days);
        deal(tokenAddr, address(vesting), expectedContrib);

        vm.warp(block.timestamp + 365 days / 2);
        uint256 claimable = vesting.vestedAmount(contributor1);
        assertGt(claimable, 0);

        vm.prank(contributor1);
        vesting.claim();
        assertEq(token.balanceOf(contributor1), claimable);
    }
}
