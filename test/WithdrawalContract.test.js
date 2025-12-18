const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("WithdrawalContract", function () {
  async function deployFixture() {
    const [owner, user, sequencer] = await ethers.getSigners();

    const DepositContract = await ethers.getContractFactory("DepositContract");
    const depositContract = await DepositContract.deploy();
    await depositContract.waitForDeployment();

    const WithdrawalContract = await ethers.getContractFactory("WithdrawalContract");
    const withdrawalContract = await WithdrawalContract.deploy(sequencer.address);
    await withdrawalContract.waitForDeployment();

    return { depositContract, withdrawalContract, owner, user, sequencer };
  }

  let depositContract;
  let withdrawalContract;
  let owner;
  let user;
  let sequencer;

  beforeEach(async function () {
    ({ depositContract, withdrawalContract, owner, user, sequencer } = await loadFixture(deployFixture));
  });

  describe("Withdrawal", function () {
    it("Should emit Withdrawal event", async function () {
      const proof = ethers.toUtf8Bytes("proof");
      const withdrawalData = {
        user: user.address,
        assetId: 1,
        amount: ethers.parseEther("1.0"),
        nonce: 0,
        stateRoot: ethers.ZeroHash,
      };

      await expect(
        withdrawalContract.connect(user).withdraw(proof, withdrawalData)
      )
        .to.emit(withdrawalContract, "Withdrawal")
        .withArgs(user.address, withdrawalData.assetId, withdrawalData.amount, ethers.anyValue);
    });

    it("Should reject zero amount", async function () {
      const proof = ethers.toUtf8Bytes("proof");
      const withdrawalData = {
        user: user.address,
        assetId: 1,
        amount: 0,
        nonce: 0,
        stateRoot: ethers.ZeroHash,
      };

      await expect(
        withdrawalContract.connect(user).withdraw(proof, withdrawalData)
      ).to.be.revertedWithCustomError(withdrawalContract, "InvalidAmount");
    });

    it("Should reject invalid user", async function () {
      const proof = ethers.toUtf8Bytes("proof");
      const withdrawalData = {
        user: owner.address,
        assetId: 1,
        amount: ethers.parseEther("1.0"),
        nonce: 0,
        stateRoot: ethers.ZeroHash,
      };

      await expect(
        withdrawalContract.connect(user).withdraw(proof, withdrawalData)
      ).to.be.revertedWithCustomError(withdrawalContract, "InvalidUser");
    });

    it("Should prevent duplicate withdrawals", async function () {
      const proof = ethers.toUtf8Bytes("proof");
      const withdrawalData = {
        user: user.address,
        assetId: 1,
        amount: ethers.parseEther("1.0"),
        nonce: 0,
        stateRoot: ethers.ZeroHash,
      };

      await withdrawalContract.connect(user).withdraw(proof, withdrawalData);

      await expect(
        withdrawalContract.connect(user).withdraw(proof, withdrawalData)
      ).to.be.revertedWithCustomError(withdrawalContract, "WithdrawalAlreadyProcessed");
    });

    it("Should reject empty proof", async function () {
      const proof = ethers.toUtf8Bytes("");
      const withdrawalData = {
        user: user.address,
        assetId: 1,
        amount: ethers.parseEther("1.0"),
        nonce: 0,
        stateRoot: ethers.ZeroHash,
      };

      await expect(
        withdrawalContract.connect(user).withdraw(proof, withdrawalData)
      ).to.be.revertedWithCustomError(withdrawalContract, "InvalidProof");
    });
  });

  describe("Sequencer Management", function () {
    it("Should allow sequencer to update sequencer address", async function () {
      const newSequencer = ethers.Wallet.createRandom().address;

      await expect(
        withdrawalContract.connect(sequencer).setSequencer(newSequencer)
      )
        .to.emit(withdrawalContract, "SequencerUpdated")
        .withArgs(sequencer.address, newSequencer);

      const updatedSequencer = await withdrawalContract.sequencer();
      expect(updatedSequencer).to.equal(newSequencer);
    });

    it("Should reject non-sequencer from updating sequencer", async function () {
      const newSequencer = ethers.Wallet.createRandom().address;

      await expect(
        withdrawalContract.connect(user).setSequencer(newSequencer)
      ).to.be.revertedWithCustomError(withdrawalContract, "OnlySequencer");
    });

    it("Should reject zero address for sequencer", async function () {
      await expect(
        withdrawalContract.connect(sequencer).setSequencer(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(withdrawalContract, "InvalidSequencerAddress");
    });

    it("Should reject zero address in constructor", async function () {
      const WithdrawalContract = await ethers.getContractFactory("WithdrawalContract");
      await expect(
        WithdrawalContract.deploy(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(WithdrawalContract, "InvalidSequencerAddress");
    });
  });
});

