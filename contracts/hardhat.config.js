require("dotenv").config();
require("solidity-coverage");
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {},
    localhost: { 
      url: "http://127.0.0.1:8545",
      chainId: 31337,
     },
    amoy: {
      url: process.env.AMOY_RPC_URL,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};