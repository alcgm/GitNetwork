// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RepoGovernance {
    enum ProposalState { Active, Passed, Failed, Executed }

    struct Proposal {
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 endsAt;
        ProposalState state;
        address proposer;
        mapping(address => bool) hasVoted;
    }

    IERC20 public immutable governanceToken;
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;

    uint256 public constant QUORUM_BPS = 1000;
    uint256 public constant PASS_THRESHOLD_BPS = 5100;

    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description, uint256 endsAt);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId, ProposalState state);

    constructor(address _governanceToken) {
        governanceToken = IERC20(_governanceToken);
    }

    function createProposal(string calldata description, uint256 votingPeriod) external returns (uint256 proposalId) {
        require(governanceToken.balanceOf(msg.sender) > 0, "RepoGovernance: no tokens");
        require(votingPeriod >= 1 days && votingPeriod <= 30 days, "RepoGovernance: invalid period");

        proposalId = proposalCount++;
        Proposal storage p = proposals[proposalId];
        p.description = description;
        p.endsAt = block.timestamp + votingPeriod;
        p.state = ProposalState.Active;
        p.proposer = msg.sender;

        emit ProposalCreated(proposalId, msg.sender, description, p.endsAt);
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];
        require(p.state == ProposalState.Active, "RepoGovernance: not active");
        require(block.timestamp < p.endsAt, "RepoGovernance: voting ended");
        require(!p.hasVoted[msg.sender], "RepoGovernance: already voted");

        uint256 weight = governanceToken.balanceOf(msg.sender);
        require(weight > 0, "RepoGovernance: no tokens");

        p.hasVoted[msg.sender] = true;
        if (support) {
            p.votesFor += weight;
        } else {
            p.votesAgainst += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    function executeProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(p.state == ProposalState.Active, "RepoGovernance: not active");
        require(block.timestamp >= p.endsAt, "RepoGovernance: voting ongoing");

        uint256 totalSupply = governanceToken.totalSupply();
        uint256 totalVotes = p.votesFor + p.votesAgainst;
        uint256 quorum = (totalSupply * QUORUM_BPS) / 10000;

        if (totalVotes < quorum) {
            p.state = ProposalState.Failed;
        } else if (p.votesFor * 10000 >= totalVotes * PASS_THRESHOLD_BPS) {
            p.state = ProposalState.Passed;
        } else {
            p.state = ProposalState.Failed;
        }

        emit ProposalExecuted(proposalId, p.state);
    }

    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return proposals[proposalId].hasVoted[voter];
    }

    function getProposal(uint256 proposalId) external view returns (
        string memory description,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 endsAt,
        ProposalState state,
        address proposer
    ) {
        Proposal storage p = proposals[proposalId];
        return (p.description, p.votesFor, p.votesAgainst, p.endsAt, p.state, p.proposer);
    }
}
