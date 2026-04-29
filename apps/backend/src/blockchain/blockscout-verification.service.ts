import { Injectable, Logger } from "@nestjs/common";
import { encodeAbiParameters, parseAbiParameters } from "viem";

// CooperativeVault.sol is self-contained (no imports), so we embed the source
// directly so it is always available at runtime (e.g. on Railway).
const COOPERATIVE_VAULT_SOURCE = `// SPDX-License-Identifier: MIT
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
`;

// Exact compiler version string expected by Blockscout / Sourcify
const SOLC_VERSION = "v0.8.26+commit.8a97fa7a";

// Max attempts and delay between retries when Blockscout hasn't indexed yet
const VERIFY_RETRY_ATTEMPTS = 4;
const VERIFY_INITIAL_DELAY_MS = 8000; // 8 s before first attempt
const VERIFY_RETRY_DELAY_MS = 10000; // 10 s between retries

type VerifyVaultParams = {
  vaultAddress: string;
  name: string;
  targetAmountXAF: number;
  adminAddress: string;
  relayerAddress: string;
};

@Injectable()
export class BlockscoutVerificationService {
  private readonly logger = new Logger(BlockscoutVerificationService.name);

  /**
   * Verifies a CooperativeVault contract on Blockscout.
   * Call fire-and-forget from cooperative creation — this method handles
   * retries internally and never throws.
   */
  async verifyCooperativeVault(params: VerifyVaultParams): Promise<void> {
    const blockscoutBase =
      (process.env.NEXT_PUBLIC_CELOSCAN_BASE ?? "").trim() ||
      "https://celo-sepolia.blockscout.com";

    const constructorArgs = this.encodeConstructorArgs(params);
    const url = `${blockscoutBase.replace(/\/+$/, "")}/api/v2/smart-contracts/${params.vaultAddress}/verification/via/flattened-code`;

    // Initial delay — let the chain / indexer pick up the new contract
    await this.delay(VERIFY_INITIAL_DELAY_MS);

    for (let attempt = 1; attempt <= VERIFY_RETRY_ATTEMPTS; attempt++) {
      try {
        const alreadyVerified = await this.isAlreadyVerified(
          blockscoutBase,
          params.vaultAddress,
        );
        if (alreadyVerified) {
          this.logger.log(
            `[BlockscoutVerification] ${params.vaultAddress} already verified — skipping.`,
          );
          return;
        }

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            compiler_version: SOLC_VERSION,
            license_type: "mit",
            is_optimization_enabled: false,
            optimization_runs: 200,
            evm_version: "cancun",
            source_code: COOPERATIVE_VAULT_SOURCE,
            contract_name: "CooperativeVault",
            constructor_args: constructorArgs,
          }),
        });

        const text = await response.text();

        if (response.ok) {
          this.logger.log(
            `[BlockscoutVerification] Submitted verification for ${params.name} (${params.vaultAddress}). Response: ${text.slice(0, 120)}`,
          );
          return;
        }

        // 404 = contract not indexed yet — retry
        if (response.status === 404) {
          this.logger.warn(
            `[BlockscoutVerification] Contract not indexed yet (attempt ${attempt}/${VERIFY_RETRY_ATTEMPTS}), retrying…`,
          );
        } else {
          this.logger.warn(
            `[BlockscoutVerification] Verification attempt ${attempt} failed (${response.status}): ${text.slice(0, 200)}`,
          );
        }
      } catch (err) {
        this.logger.warn(
          `[BlockscoutVerification] Attempt ${attempt} error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      if (attempt < VERIFY_RETRY_ATTEMPTS) {
        await this.delay(VERIFY_RETRY_DELAY_MS);
      }
    }

    this.logger.warn(
      `[BlockscoutVerification] All ${VERIFY_RETRY_ATTEMPTS} attempts exhausted for ${params.vaultAddress}. Verify manually: npx hardhat verify --network celoSepolia ${params.vaultAddress} "${params.name}" ${params.targetAmountXAF} ${params.adminAddress} ${params.relayerAddress}`,
    );
  }

  private encodeConstructorArgs(params: VerifyVaultParams): string {
    // ABI-encode (string, uint256, address, address) — strip the 0x prefix
    // because Blockscout expects the raw hex without the "0x" prefix.
    const encoded = encodeAbiParameters(
      parseAbiParameters("string, uint256, address, address"),
      [
        params.name,
        BigInt(params.targetAmountXAF),
        params.adminAddress as `0x${string}`,
        params.relayerAddress as `0x${string}`,
      ],
    );
    return encoded.startsWith("0x") ? encoded.slice(2) : encoded;
  }

  private async isAlreadyVerified(
    blockscoutBase: string,
    vaultAddress: string,
  ): Promise<boolean> {
    try {
      const res = await fetch(
        `${blockscoutBase.replace(/\/+$/, "")}/api/v2/smart-contracts/${vaultAddress}`,
      );
      if (!res.ok) return false;
      const json = (await res.json()) as { is_verified?: boolean };
      return json.is_verified === true;
    } catch {
      return false;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
