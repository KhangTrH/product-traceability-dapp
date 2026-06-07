require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  // ─────────────────────────────────────────────
  //  Solidity Compiler
  // ─────────────────────────────────────────────
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  // ─────────────────────────────────────────────
  //  Networks
  // ─────────────────────────────────────────────
  networks: {
    // Mạng local Hardhat (mặc định khi chạy test và deploy)
    hardhat: {
      chainId: 31337,
    },

    // Localhost: dùng khi chạy `npx hardhat node` riêng
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },

    // Sepolia Testnet (để deploy thật sau này)
    // sepolia: {
    //   url: process.env.SEPOLIA_RPC_URL || "",
    //   accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    //   chainId: 11155111,
    // },
  },

  // ─────────────────────────────────────────────
  //  Paths
  // ─────────────────────────────────────────────
  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },

  // ─────────────────────────────────────────────
  //  Gas Reporter (npm install --save-dev hardhat-gas-reporter)
  // ─────────────────────────────────────────────
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
};
