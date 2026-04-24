import { expect } from "chai";
import hre from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs.js";

const { ethers } = hre;

type ForwardRequest = {
  from: string;
  to: string;
  nonce: string | number;
  deadline: string | number;
  data: string;
};

async function signForwardRequest(
  relayerAddress: string,
  request: ForwardRequest,
  signer: Awaited<ReturnType<typeof ethers.getSigners>>[number],
) {
  const { chainId } = await ethers.provider.getNetwork();
  const encoded = new ethers.utils.AbiCoder().encode(
    [
      "address",
      "uint256",
      "address",
      "address",
      "uint256",
      "uint256",
      "bytes32",
    ],
    [
      relayerAddress,
      chainId,
      request.from,
      request.to,
      request.nonce,
      request.deadline,
      ethers.utils.keccak256(request.data),
    ],
  );

  const digest = ethers.utils.keccak256(encoded);
  return signer.signMessage(ethers.utils.arrayify(digest));
}

describe("CoopEnergie contracts", function () {
  describe("GasRelayer", function () {
    it("owner can add whitelisted addresses", async function () {
      const [owner] = await ethers.getSigners();
      const RelayerFactory = await ethers.getContractFactory(
        "GasRelayer",
        owner,
      );
      const relayer = await RelayerFactory.deploy();
      await relayer.deployed();

      const target = ethers.Wallet.createRandom().address;

      await expect(relayer.addWhitelisted(target))
        .to.emit(relayer, "TargetWhitelisted")
        .withArgs(target);

      expect(await relayer.whitelistedTargets(target)).to.equal(true);
    });

    it("non-owner cannot call execute", async function () {
      const [owner, admin, user, other] = await ethers.getSigners();
      const RelayerFactory = await ethers.getContractFactory(
        "GasRelayer",
        owner,
      );
      const relayer = await RelayerFactory.deploy();
      await relayer.deployed();

      const VaultFactory = await ethers.getContractFactory(
        "CooperativeVault",
        owner,
      );
      const vault = await VaultFactory.deploy(
        "Bonaberi",
        850000,
        admin.address,
        relayer.address,
      );
      await vault.deployed();

      await relayer.addWhitelisted(vault.address);

      const request: ForwardRequest = {
        from: user.address,
        to: vault.address,
        nonce: 0,
        deadline: (await timeNow()) + 3600,
        data: vault.interface.encodeFunctionData("contribute", [
          user.address,
          1000,
        ]),
      };
      const signature = await signForwardRequest(
        relayer.address,
        request,
        user,
      );

      await expect(relayer.connect(other).execute(request, signature)).to.be
        .reverted;
    });

    it("increments nonce after each valid execution", async function () {
      const [owner, admin, user] = await ethers.getSigners();
      const RelayerFactory = await ethers.getContractFactory(
        "GasRelayer",
        owner,
      );
      const relayer = await RelayerFactory.deploy();
      await relayer.deployed();

      const VaultFactory = await ethers.getContractFactory(
        "CooperativeVault",
        owner,
      );
      const vault = await VaultFactory.deploy(
        "Bonaberi",
        850000,
        admin.address,
        relayer.address,
      );
      await vault.deployed();

      await relayer.addWhitelisted(vault.address);

      for (const [index, amount] of [5000, 7500].entries()) {
        const nonce = await relayer.getNonce(user.address);
        const request: ForwardRequest = {
          from: user.address,
          to: vault.address,
          nonce,
          deadline: (await timeNow()) + 3600,
          data: vault.interface.encodeFunctionData("contribute", [
            user.address,
            amount,
          ]),
        };
        const signature = await signForwardRequest(
          relayer.address,
          request,
          user,
        );

        await expect(relayer.execute(request, signature))
          .to.emit(relayer, "MetaTransactionExecuted")
          .withArgs(user.address, vault.address, index, true);

        expect(await relayer.getNonce(user.address)).to.equal(index + 1);
      }

      expect(await vault.getMemberContribution(user.address)).to.equal(12500);
    });
  });

  describe("CooperativeVault", function () {
    async function deployVaultFixture() {
      const [deployer, admin, relayerSigner, member, outsider, ...voters] =
        await ethers.getSigners();
      const VaultFactory = await ethers.getContractFactory(
        "CooperativeVault",
        deployer,
      );
      const vault = await VaultFactory.deploy(
        "Cooperative Solaire Bonaberi",
        850000,
        admin.address,
        relayerSigner.address,
      );
      await vault.deployed();

      return {
        deployer,
        admin,
        relayerSigner,
        member,
        outsider,
        voters,
        vault,
      };
    }

    it("only relayer can call contribute, createProposal, and vote", async function () {
      const { vault, admin, outsider, member } = await deployVaultFixture();

      await expect(vault.connect(outsider).contribute(member.address, 1000)).to
        .be.reverted;
      await expect(vault.connect(admin).contribute(member.address, 1000)).to.be
        .reverted;

      await expect(
        vault
          .connect(outsider)
          .createProposal(member.address, "Solar", "Install panels"),
      ).to.be.reverted;
      await expect(
        vault
          .connect(admin)
          .createProposal(member.address, "Solar", "Install panels"),
      ).to.be.reverted;

      await expect(vault.connect(outsider).vote(member.address, 1, true)).to.be
        .reverted;
      await expect(vault.connect(admin).vote(member.address, 1, true)).to.be
        .reverted;
    });

    it("contribute emits ContributionMade with correct data", async function () {
      const { vault, relayerSigner, member } = await deployVaultFixture();

      await expect(
        vault.connect(relayerSigner).contribute(member.address, 50000),
      )
        .to.emit(vault, "ContributionMade")
        .withArgs(member.address, 50000, 50000, anyValue);
    });

    it("createProposal emits ProposalCreated", async function () {
      const { vault, relayerSigner, member } = await deployVaultFixture();

      await expect(
        vault
          .connect(relayerSigner)
          .createProposal(
            member.address,
            "Installation panneau Bonaberi Phase 1",
            "Installer les premiers panneaux pour la cooperative.",
          ),
      )
        .to.emit(vault, "ProposalCreated")
        .withArgs(
          1,
          member.address,
          "Installation panneau Bonaberi Phase 1",
          anyValue,
        );
    });

    it("vote emits VoteCast", async function () {
      const { vault, relayerSigner, member, voters } =
        await deployVaultFixture();

      await vault
        .connect(relayerSigner)
        .createProposal(
          member.address,
          "Solar Expansion",
          "Extend the solar grid.",
        );

      await expect(
        vault.connect(relayerSigner).vote(voters[0].address, 1, true),
      )
        .to.emit(vault, "VoteCast")
        .withArgs(1, voters[0].address, true, 1, 0, anyValue);
    });

    it("prevents double voting", async function () {
      const { vault, relayerSigner, member, voters } =
        await deployVaultFixture();

      await vault
        .connect(relayerSigner)
        .createProposal(
          member.address,
          "Solar Expansion",
          "Extend the solar grid.",
        );
      await vault.connect(relayerSigner).vote(voters[0].address, 1, true);

      await expect(
        vault.connect(relayerSigner).vote(voters[0].address, 1, false),
      ).to.be.revertedWithCustomError(vault, "AlreadyVoted");
    });

    it("resolves proposals automatically at quorum", async function () {
      const { vault, relayerSigner, member, voters } =
        await deployVaultFixture();

      await vault
        .connect(relayerSigner)
        .createProposal(
          member.address,
          "Solar Expansion",
          "Extend the solar grid.",
        );

      for (let i = 0; i < 5; i += 1) {
        await vault.connect(relayerSigner).vote(voters[i].address, 1, true);
      }

      await expect(
        vault.connect(relayerSigner).vote(voters[5].address, 1, true),
      )
        .to.emit(vault, "ProposalResolved")
        .withArgs(1, true, 6, 0);

      const proposal = await vault.getProposal(1);
      expect(proposal.resolved).to.equal(true);
      expect(proposal.approved).to.equal(true);
      expect(proposal.yesVotes).to.equal(6);
      expect(proposal.noVotes).to.equal(0);
    });

    it("releaseFunds only works on approved proposal and only by admin", async function () {
      const { vault, admin, relayerSigner, member, outsider, voters } =
        await deployVaultFixture();

      await vault
        .connect(relayerSigner)
        .createProposal(
          member.address,
          "Solar Expansion",
          "Extend the solar grid.",
        );

      await expect(
        vault.connect(admin).releaseFunds(outsider.address, 20000, 1),
      ).to.be.revertedWithCustomError(vault, "ProposalNotApproved");

      for (let i = 0; i < 6; i += 1) {
        await vault.connect(relayerSigner).vote(voters[i].address, 1, true);
      }

      await expect(
        vault.connect(outsider).releaseFunds(member.address, 20000, 1),
      ).to.be.reverted;

      await expect(vault.connect(admin).releaseFunds(member.address, 20000, 1))
        .to.emit(vault, "FundsReleased")
        .withArgs(member.address, 20000, 1, anyValue);
    });
  });

  describe("CoopFactory", function () {
    it("deploys a cooperative vault and tracks it", async function () {
      const [owner, admin] = await ethers.getSigners();
      const RelayerFactory = await ethers.getContractFactory(
        "GasRelayer",
        owner,
      );
      const relayer = await RelayerFactory.deploy();
      await relayer.deployed();

      const FactoryFactory = await ethers.getContractFactory(
        "CoopFactory",
        owner,
      );
      const factory = await FactoryFactory.deploy(relayer.address);
      await factory.deployed();

      await relayer.transferOwnership(factory.address);

      await expect(
        factory.deployCooperative(
          "Cooperative Solaire Bonaberi",
          850000,
          admin.address,
        ),
      )
        .to.emit(factory, "CooperativeDeployed")
        .withArgs(
          anyValue,
          "Cooperative Solaire Bonaberi",
          admin.address,
          anyValue,
        );

      expect(await factory.getVaultCount()).to.equal(1);

      const vaults = await factory.getAllVaults();
      expect(vaults).to.have.lengthOf(1);
      expect(await factory.isVault(vaults[0])).to.equal(true);
      expect(await relayer.whitelistedTargets(vaults[0])).to.equal(true);
    });
  });
});

async function timeNow() {
  const latestBlock = await ethers.provider.getBlock("latest");
  return latestBlock!.timestamp;
}
