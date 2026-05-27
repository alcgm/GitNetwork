// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAerodromeRouter {
    function addLiquidityETH(
        address token,
        bool stable,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity);
}

contract RepoTreasury is Ownable, ReentrancyGuard {
    IERC20 public immutable repoToken;
    uint256 public totalETHReceived;
    uint256 public totalLPSeeded;
    bool public liquiditySeeded;

    event LiquiditySeeded(address indexed tokenAddress, uint256 ethAmount, uint256 tokenAmount, uint256 lpTokens);
    event ETHReceived(address indexed sender, uint256 amount);

    constructor(address _repoToken, address _owner) Ownable(_owner) {
        repoToken = IERC20(_repoToken);
    }

    receive() external payable {
        totalETHReceived += msg.value;
        emit ETHReceived(msg.sender, msg.value);
    }

    function seedLiquidity(address aerodromeRouter, address /*weth*/) external onlyOwner nonReentrant {
        require(!liquiditySeeded, "RepoTreasury: already seeded");
        uint256 ethBalance = address(this).balance;
        uint256 tokenBalance = repoToken.balanceOf(address(this));
        require(ethBalance > 0, "RepoTreasury: no ETH");
        require(tokenBalance > 0, "RepoTreasury: no tokens");

        repoToken.approve(aerodromeRouter, tokenBalance);

        (, , uint256 liquidity) = IAerodromeRouter(aerodromeRouter).addLiquidityETH{value: ethBalance}(
            address(repoToken),
            false,
            tokenBalance,
            0,
            0,
            owner(),
            block.timestamp + 600
        );

        totalLPSeeded += liquidity;
        liquiditySeeded = true;

        emit LiquiditySeeded(address(repoToken), ethBalance, tokenBalance, liquidity);
    }

    function withdrawETH() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "RepoTreasury: no ETH");
        (bool ok, ) = owner().call{value: balance}("");
        require(ok, "RepoTreasury: ETH transfer failed");
    }

    function withdrawToken(address tokenAddr) external onlyOwner nonReentrant {
        IERC20 t = IERC20(tokenAddr);
        uint256 bal = t.balanceOf(address(this));
        require(bal > 0, "RepoTreasury: no tokens");
        require(t.transfer(owner(), bal), "RepoTreasury: transfer failed");
    }
}
