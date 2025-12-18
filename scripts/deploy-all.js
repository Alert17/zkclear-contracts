const hre = require("hardhat");

const networks = [
  "ethereum",
  "mantle",
];

async function deployToNetwork(networkName) {
  console.log(`\n=== Deploying to ${networkName.toUpperCase()} ===`);
  
  try {
    hre.config.defaultNetwork = networkName;
    
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

    const chainId = await hre.ethers.provider.getNetwork().then(n => Number(n.chainId));
    const [deployer] = await hre.ethers.getSigners();
    
    return {
      network: networkName,
      chainId,
      deployer: deployer.address,
      depositAddress,
      withdrawalAddress,
    };
  } catch (error) {
    console.error(`Error deploying to ${networkName}:`, error.message);
    return null;
  }
}

async function main() {
  console.log("Deploying ZKClear contracts to all networks...\n");

  const results = [];

  for (const networkName of networks) {
    const result = await deployToNetwork(networkName);
    if (result) {
      results.push(result);
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log("\n=== Deployment Summary ===");
  console.log(JSON.stringify(results, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

