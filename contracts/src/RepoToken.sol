// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract RepoToken is ERC20, ERC20Permit {
    bytes32 public immutable repoDID;
    address public immutable factory;
    string public repoUrl;

    event RepoTokenCreated(bytes32 indexed repoDID, address indexed tokenAddress, string repoUrl);

    modifier onlyFactory() {
        require(msg.sender == factory, "RepoToken: only factory");
        _;
    }

    constructor(
        bytes32 _repoDID,
        string memory _name,
        string memory _symbol,
        string memory _repoUrl,
        address _factory
    ) ERC20(_name, _symbol) ERC20Permit(_name) {
        repoDID = _repoDID;
        factory = _factory;
        repoUrl = _repoUrl;
        emit RepoTokenCreated(_repoDID, address(this), _repoUrl);
    }

    function mint(address to, uint256 amount) external onlyFactory {
        _mint(to, amount);
    }
}
