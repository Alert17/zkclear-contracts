const hre = require("hardhat");

async function main() {
  const chainId = await hre.ethers.provider.getNetwork().then(n => n.chainId);
  console.log(`Deploying to chain ID: ${chainId}`);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  const DepositContract = await hre.ethers.getContractFactory("DepositContract");
  const depositContract = await DepositContract.deploy();
  await depositContract.waitForDeployment();
  const depositAddress = await depositContract.getAddress();
  console.log("DepositContract deployed to:", depositAddress);

  const WithdrawalContract = await hre.ethers.getContractFactory("WithdrawalContract");
  const withdrawalContract = await WithdrawalContract.deploy(depositAddress);
  await withdrawalContract.waitForDeployment();
  const withdrawalAddress = await withdrawalContract.getAddress();
  console.log("WithdrawalContract deployed to:", withdrawalAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("Chain ID:", chainId);
  console.log("DepositContract:", depositAddress);
  console.log("WithdrawalContract:", withdrawalAddress);
  console.log("Deployer:", deployer.address);

  const verifiableChains = [1];
  if (verifiableChains.includes(Number(chainId))) {
    console.log("\nWaiting for block confirmations...");
    if (depositContract.deploymentTransaction()) {
      await depositContract.deploymentTransaction().wait(5);
    }
    if (withdrawalContract.deploymentTransaction()) {
      await withdrawalContract.deploymentTransaction().wait(5);
    }

    console.log("\nVerifying contracts on block explorer...");
    try {
      await hre.run("verify:verify", {
        address: depositAddress,
        constructorArguments: [],
      });
    } catch (error) {
      console.log("Error verifying DepositContract:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: withdrawalAddress,
        constructorArguments: [depositAddress],
      });
    } catch (error) {
      console.log("Error verifying WithdrawalContract:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

