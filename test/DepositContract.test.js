const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("DepositContract", function () {
  async function deployFixture() {
    const [owner, user] = await ethers.getSigners();

    const DepositContract = await ethers.getContractFactory("DepositContract");
    const depositContract = await DepositContract.deploy();
    await depositContract.waitForDeployment();

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const mockToken = await ERC20Mock.deploy(
      "Test Token",
      "TEST",
      owner.address,
      ethers.parseEther("1000000")
    );
    await mockToken.waitForDeployment();

    await depositContract.connect(owner).registerAsset(1, await mockToken.getAddress());
    await mockToken.transfer(user.address, ethers.parseEther("1000"));
    await mockToken.connect(user).approve(await depositContract.getAddress(), ethers.MaxUint256);

    return { depositContract, mockToken, owner, user };
  }

  let depositContract;
  let mockToken;
  let owner;
  let user;

  beforeEach(async function () {
    ({ depositContract, mockToken, owner, user } = await loadFixture(deployFixture));
  });

  describe("Deposit", function () {
    it("Should emit Deposit event", async function () {
      const assetId = 1;
      const amount = ethers.parseEther("1.0");

      await expect(depositContract.connect(user).deposit(assetId, amount))
        .to.emit(depositContract, "Deposit")
        .withArgs(user.address, assetId, amount, ethers.anyValue);
    });

    it("Should transfer tokens to contract", async function () {
      const assetId = 1;
      const amount = ethers.parseEther("1.0");
      const contractAddress = await depositContract.getAddress();

      const balanceBefore = await mockToken.balanceOf(contractAddress);
      await depositContract.connect(user).deposit(assetId, amount);
      const balanceAfter = await mockToken.balanceOf(contractAddress);

      expect(balanceAfter - balanceBefore).to.equal(amount);
    });

    it("Should reject zero amount", async function () {
      const assetId = 1;
      const amount = 0;

      await expect(
        depositContract.connect(user).deposit(assetId, amount)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should reject unregistered asset", async function () {
      const assetId = 999;
      const amount = ethers.parseEther("1.0");

      await expect(
        depositContract.connect(user).deposit(assetId, amount)
      ).to.be.revertedWith("Asset not registered");
    });

    it("Should prevent duplicate deposits", async function () {
      const assetId = 1;
      const amount = ethers.parseEther("1.0");

      await depositContract.connect(user).deposit(assetId, amount);

      await expect(
        depositContract.connect(user).deposit(assetId, amount)
      ).to.be.revertedWith("Deposit already processed");
    });
  });

  describe("Native ETH Deposits", function () {
    it("Should handle native ETH deposits for unregistered assets", async function () {
      const assetId = 0;
      const amount = ethers.parseEther("1.0");

      await expect(
        depositContract.connect(user).depositNative(assetId, { value: amount })
      )
        .to.emit(depositContract, "Deposit")
        .withArgs(user.address, assetId, amount, ethers.anyValue);
    });

    it("Should reject native ETH deposit when asset is registered", async function () {
      const assetId = 1;
      const amount = ethers.parseEther("1.0");

      await expect(
        depositContract.connect(user).depositNative(assetId, { value: amount })
      ).to.be.revertedWith("Use ERC20 deposit for this asset");
    });

    it("Should reject zero native ETH amount", async function () {
      const assetId = 0;
      const amount = 0;

      await expect(
        depositContract.connect(user).depositNative(assetId, { value: amount })
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should reject direct ETH transfers", async function () {
      await expect(
        user.sendTransaction({
          to: await depositContract.getAddress(),
          value: ethers.parseEther("1.0"),
        })
      ).to.be.revertedWith("Use depositNative function");
    });
  });

  describe("Asset Registration", function () {
    it("Should allow owner to register assets", async function () {
      const assetId = 2;
      const tokenAddress = await mockToken.getAddress();

      await depositContract.connect(owner).registerAsset(assetId, tokenAddress);
      const registeredAddress = await depositContract.assetAddresses(assetId);
      expect(registeredAddress).to.equal(tokenAddress);
    });

    it("Should reject non-owner from registering assets", async function () {
      const assetId = 2;
      const tokenAddress = await mockToken.getAddress();

      await expect(
        depositContract.connect(user).registerAsset(assetId, tokenAddress)
      ).to.be.revertedWithCustomError(depositContract, "OwnableUnauthorizedAccount");
    });

    it("Should reject zero address for asset registration", async function () {
      await expect(
        depositContract.connect(owner).registerAsset(2, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid token address");
    });
  });

  describe("Owner Functions", function () {
    it("Should allow owner to withdraw tokens", async function () {
      const assetId = 1;
      const amount = ethers.parseEther("1.0");
      
      await depositContract.connect(user).deposit(assetId, amount);
      
      const balanceBefore = await mockToken.balanceOf(owner.address);
      
      await depositContract.connect(owner).withdrawTokens(await mockToken.getAddress(), amount);
      
      const balanceAfter = await mockToken.balanceOf(owner.address);
      expect(balanceAfter - balanceBefore).to.equal(amount);
    });

    it("Should allow owner to withdraw native ETH", async function () {
      const assetId = 0;
      const amount = ethers.parseEther("1.0");
      
      await depositContract.connect(user).depositNative(assetId, { value: amount });
      
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      
      const tx = await depositContract.connect(owner).withdrawNative(amount);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(ownerBalanceAfter - ownerBalanceBefore + gasUsed).to.equal(amount);
    });

    it("Should reject non-owner from withdrawing tokens", async function () {
      await expect(
        depositContract.connect(user).withdrawTokens(await mockToken.getAddress(), ethers.parseEther("1.0"))
      ).to.be.revertedWithCustomError(depositContract, "OwnableUnauthorizedAccount");
    });

    it("Should reject non-owner from withdrawing native ETH", async function () {
      await expect(
        depositContract.connect(user).withdrawNative(ethers.parseEther("1.0"))
      ).to.be.revertedWithCustomError(depositContract, "OwnableUnauthorizedAccount");
    });

    it("Should reject zero address for token withdrawal", async function () {
      await expect(
        depositContract.connect(owner).withdrawTokens(ethers.ZeroAddress, ethers.parseEther("1.0"))
      ).to.be.revertedWith("Invalid token address");
    });

    it("Should reject insufficient balance for native withdrawal", async function () {
      const assetId = 0;
      const depositAmount = ethers.parseEther("1.0");
      const withdrawAmount = ethers.parseEther("2.0");
      
      await depositContract.connect(user).depositNative(assetId, { value: depositAmount });
      
      await expect(
        depositContract.connect(owner).withdrawNative(withdrawAmount)
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Multiple Deposits", function () {
    it("Should handle multiple ERC20 deposits", async function () {
      const assetId = 1;
      const amount1 = ethers.parseEther("1.0");
      const amount2 = ethers.parseEther("2.0");

      await depositContract.connect(user).deposit(assetId, amount1);
      await depositContract.connect(user).deposit(assetId, amount2);

      const contractAddress = await depositContract.getAddress();
      const totalBalance = await mockToken.balanceOf(contractAddress);
      expect(totalBalance).to.equal(amount1 + amount2);
    });

    it("Should handle multiple native ETH deposits", async function () {
      const assetId = 0;
      const amount1 = ethers.parseEther("1.0");
      const amount2 = ethers.parseEther("2.0");

      await depositContract.connect(user).depositNative(assetId, { value: amount1 });
      await depositContract.connect(user).depositNative(assetId, { value: amount2 });

      const contractAddress = await depositContract.getAddress();
      const totalBalance = await ethers.provider.getBalance(contractAddress);
      expect(totalBalance).to.equal(amount1 + amount2);
    });
  });
});

