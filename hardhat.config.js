require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

const ETHEREUM_RPC = process.env.ETHEREUM_RPC || "https://eth.llamarpc.com";
const MANTLE_RPC = process.env.MANTLE_RPC || "https://rpc.mantle.xyz";

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    ethereum: {
      url: ETHEREUM_RPC,
      accounts: [PRIVATE_KEY],
      chainId: 1,
    },
    mantle: {
      url: MANTLE_RPC,
      accounts: [PRIVATE_KEY],
      chainId: 5000,
    },
  },
  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_API_KEY,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

