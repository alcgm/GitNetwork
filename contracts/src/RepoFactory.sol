// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./RepoToken.sol";
import "./ContributorVesting.sol";
import "./RepoTreasury.sol";

contract RepoFactory is Ownable, ReentrancyGuard {
    uint256 public constant LAUNCH_FEE = 0.005 ether;
    uint256 public constant PROTOCOL_BPS = 1000;
    uint256 public constant MAX_CONTRIBUTOR_BPS = 9000;

    mapping(bytes32 => address) public repoTokens;

    event TokenLaunched(
        bytes32 indexed repoDID,
        address indexed tokenAddress,
        address indexed deployer,
        address vestingContract,
        address treasuryContract
    );

    constructor(address _owner) Ownable(_owner) {}

    function launchRepoToken(
        bytes32 repoDID,
        string calldata repoUrl,
        string calldata name,
        string calldata symbol,
        uint256 totalSupply,
        address[] calldata contributors,
        uint256[] calldata sharesBps,
        uint256 vestingCliff,
        uint256 vestingDuration,
        uint256 publicSaleBps
    ) external payable nonReentrant returns (address tokenAddress) {
        require(msg.value >= LAUNCH_FEE, "RepoFactory: insufficient fee");
        require(repoTokens[repoDID] == address(0), "RepoFactory: already launched");
        require(contributors.length == sharesBps.length, "RepoFactory: length mismatch");
        require(totalSupply > 0, "RepoFactory: zero supply");

        uint256 totalBps = publicSaleBps;
        for (uint256 i = 0; i < sharesBps.length; i++) {
            totalBps += sharesBps[i];
        }
        require(totalBps <= MAX_CONTRIBUTOR_BPS, "RepoFactory: exceeds max contributor bps");

        RepoToken token = new RepoToken(repoDID, name, symbol, repoUrl, address(this));
        tokenAddress = address(token);
        repoTokens[repoDID] = tokenAddress;

        uint256 protocolAmount = (totalSupply * PROTOCOL_BPS) / 10000;
        token.mint(owner(), protocolAmount);

        uint256[] memory vestingAmounts = new uint256[](contributors.length);
        for (uint256 i = 0; i < contributors.length; i++) {
            vestingAmounts[i] = (totalSupply * sharesBps[i]) / 10000;
        }

        ContributorVesting vesting = new ContributorVesting(
            tokenAddress,
            contributors,
            vestingAmounts,
            vestingCliff,
            vestingDuration
        );

        for (uint256 i = 0; i < contributors.length; i++) {
            token.mint(address(vesting), vestingAmounts[i]);
        }

        RepoTreasury treasury = new RepoTreasury(tokenAddress, owner());

        if (publicSaleBps > 0) {
            uint256 publicAmount = (totalSupply * publicSaleBps) / 10000;
            token.mint(address(treasury), publicAmount);
        }

        uint256 feeToSend = msg.value;
        (bool ok, ) = owner().call{value: feeToSend}("");
        require(ok, "RepoFactory: fee transfer failed");

        emit TokenLaunched(repoDID, tokenAddress, msg.sender, address(vesting), address(treasury));
    }

    function getToken(bytes32 repoDID) external view returns (address) {
        return repoTokens[repoDID];
    }
}
