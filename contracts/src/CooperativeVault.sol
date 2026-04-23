// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract CooperativeVault {
    struct Proposal {
        uint256 id;
        string title;
        string description;
        uint256 yesVotes;
        uint256 noVotes;
        bool resolved;
        bool approved;
        uint256 createdAt;
    }

    string public cooperativeName;
    uint256 public targetAmountXAF;
    address public admin;
    address public relayer;
    uint256 public totalContributedXAF;
    mapping(address => uint256) public memberContributions;
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ContributionMade(
        address indexed member,
        uint256 amountXAF,
        uint256 totalXAF,
        uint256 timestamp
    );
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed creator,
        string title,
        uint256 timestamp
    );
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool choice,
        uint256 yesVotes,
        uint256 noVotes,
        uint256 timestamp
    );
    event ProposalResolved(
        uint256 indexed proposalId,
        bool approved,
        uint256 yesVotes,
        uint256 noVotes
    );
    event FundsReleased(
        address indexed recipient,
        uint256 amountXAF,
        uint256 indexed proposalId,
        uint256 timestamp
    );

    error UnauthorizedCaller();
    error InvalidAddress();
    error InvalidAmount();
    error InvalidProposal();
    error ProposalAlreadyResolved();
    error AlreadyVoted();
    error ProposalNotApproved();

    modifier onlyRelayer() {
        if (msg.sender != relayer) {
            revert UnauthorizedCaller();
        }
        _;
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) {
            revert UnauthorizedCaller();
        }
        _;
    }

    constructor(
        string memory _name,
        uint256 _target,
        address _admin,
        address _relayer
    ) {
        if (_admin == address(0) || _relayer == address(0)) {
            revert InvalidAddress();
        }

        cooperativeName = _name;
        targetAmountXAF = _target;
        admin = _admin;
        relayer = _relayer;
    }

    function contribute(
        address member,
        uint256 amountXAF
    ) external onlyRelayer {
        if (member == address(0)) {
            revert InvalidAddress();
        }
        if (amountXAF == 0) {
            revert InvalidAmount();
        }

        memberContributions[member] += amountXAF;
        totalContributedXAF += amountXAF;

        emit ContributionMade(
            member,
            amountXAF,
            totalContributedXAF,
            block.timestamp
        );
    }

    function createProposal(
        address creator,
        string memory title,
        string memory description
    ) external onlyRelayer {
        if (creator == address(0)) {
            revert InvalidAddress();
        }

        proposalCount += 1;
        uint256 newProposalId = proposalCount;

        proposals[newProposalId] = Proposal({
            id: newProposalId,
            title: title,
            description: description,
            yesVotes: 0,
            noVotes: 0,
            resolved: false,
            approved: false,
            createdAt: block.timestamp
        });

        emit ProposalCreated(
            newProposalId,
            creator,
            title,
            block.timestamp
        );
    }

    function vote(
        address voter,
        uint256 proposalId,
        bool choice
    ) external onlyRelayer {
        if (voter == address(0)) {
            revert InvalidAddress();
        }
        if (proposalId == 0 || proposalId > proposalCount) {
            revert InvalidProposal();
        }
        if (hasVoted[proposalId][voter]) {
            revert AlreadyVoted();
        }

        Proposal storage proposal = proposals[proposalId];
        if (proposal.resolved) {
            revert ProposalAlreadyResolved();
        }

        hasVoted[proposalId][voter] = true;

        if (choice) {
            proposal.yesVotes += 1;
        } else {
            proposal.noVotes += 1;
        }

        emit VoteCast(
            proposalId,
            voter,
            choice,
            proposal.yesVotes,
            proposal.noVotes,
            block.timestamp
        );

        uint256 totalVotes = proposal.yesVotes + proposal.noVotes;
        if (totalVotes > 5 && proposal.yesVotes != proposal.noVotes) {
            proposal.resolved = true;
            proposal.approved = proposal.yesVotes > proposal.noVotes;

            emit ProposalResolved(
                proposalId,
                proposal.approved,
                proposal.yesVotes,
                proposal.noVotes
            );
        }
    }

    function releaseFunds(
        address recipient,
        uint256 amountXAF,
        uint256 proposalId
    ) external onlyAdmin {
        if (recipient == address(0)) {
            revert InvalidAddress();
        }
        if (amountXAF == 0) {
            revert InvalidAmount();
        }
        if (proposalId == 0 || proposalId > proposalCount) {
            revert InvalidProposal();
        }

        Proposal storage proposal = proposals[proposalId];
        if (!proposal.resolved || !proposal.approved) {
            revert ProposalNotApproved();
        }

        emit FundsReleased(recipient, amountXAF, proposalId, block.timestamp);
    }

    function getProposal(uint256 id) external view returns (Proposal memory) {
        if (id == 0 || id > proposalCount) {
            revert InvalidProposal();
        }

        return proposals[id];
    }

    function getMemberContribution(
        address member
    ) external view returns (uint256) {
        return memberContributions[member];
    }
}
