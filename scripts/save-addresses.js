const fs = require("fs");
const path = require("path");

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  const [deployer] = await hre.ethers.getSigners();
  
  const DepositContract = await hre.ethers.getContractFactory("DepositContract");
  const depositContract = await DepositContract.deploy();
  await depositContract.waitForDeployment();
  const depositAddress = await depositContract.getAddress();

  const WithdrawalContract = await hre.ethers.getContractFactory("WithdrawalContract");
  const withdrawalContract = await WithdrawalContract.deploy(depositAddress);
  await withdrawalContract.waitForDeployment();
  const withdrawalAddress = await withdrawalContract.getAddress();

  const addresses = {
    chainId,
    network: network.name,
    deployer: deployer.address,
    contracts: {
      deposit: depositAddress,
      withdrawal: withdrawalAddress,
    },
    timestamp: new Date().toISOString(),
  };

  const filename = `deployments-${chainId}.json`;
  const filepath = path.join(__dirname, "..", filename);
  
  fs.writeFileSync(filepath, JSON.stringify(addresses, null, 2));
  console.log(`\nAddresses saved to ${filename}`);
  console.log(JSON.stringify(addresses, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

