// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ContributorVesting is ReentrancyGuard {
    struct VestingSchedule {
        uint256 total;
        uint256 released;
        uint256 start;
        uint256 cliff;
        uint256 duration;
    }

    IERC20 public immutable token;
    mapping(address => VestingSchedule) public schedules;
    address[] public contributors;

    event Claimed(address indexed contributor, uint256 amount, uint256 timestamp);

    constructor(
        address _token,
        address[] memory _contributors,
        uint256[] memory _amounts,
        uint256 _cliff,
        uint256 _duration
    ) {
        require(_contributors.length == _amounts.length, "ContributorVesting: length mismatch");
        token = IERC20(_token);

        for (uint256 i = 0; i < _contributors.length; i++) {
            require(_contributors[i] != address(0), "ContributorVesting: zero address");
            require(_amounts[i] > 0, "ContributorVesting: zero amount");
            schedules[_contributors[i]] = VestingSchedule({
                total: _amounts[i],
                released: 0,
                start: block.timestamp,
                cliff: _cliff,
                duration: _duration
            });
            contributors.push(_contributors[i]);
        }
    }

    function vestedAmount(address contributor) public view returns (uint256) {
        VestingSchedule storage s = schedules[contributor];
        if (s.total == 0) return 0;
        if (block.timestamp < s.start + s.cliff) return 0;
        if (block.timestamp >= s.start + s.cliff + s.duration) {
            return s.total - s.released;
        }
        uint256 elapsed = block.timestamp - (s.start + s.cliff);
        uint256 vested = (s.total * elapsed) / s.duration;
        if (vested > s.total) vested = s.total;
        return vested - s.released;
    }

    function claim() external nonReentrant {
        uint256 claimable = vestedAmount(msg.sender);
        require(claimable > 0, "ContributorVesting: nothing to claim");

        schedules[msg.sender].released += claimable;
        require(token.transfer(msg.sender, claimable), "ContributorVesting: transfer failed");

        emit Claimed(msg.sender, claimable, block.timestamp);
    }

    function getContributors() external view returns (address[] memory) {
        return contributors;
    }
}
