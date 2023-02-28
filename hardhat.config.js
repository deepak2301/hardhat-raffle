require("@nomicfoundation/hardhat-chai-matchers")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()
/** @type import('hardhat/config').HardhatUserConfig */

const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY
const COINMARKET = process.env.COINMARKET
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY

module.exports = {
   defaultNetwork: "hardhat",
   networks: {
      hardhat: {
         chainId: 31337,
         blockConfirmations: 1,
      },
      goerli: {
         chainId: 5,
         blockConfirmations: 1,
         url: GOERLI_RPC_URL,
         accounts: [PRIVATE_KEY],
      },
   },
   gasReporter: {
      enabled: false,
      currency: "USD",
      outputFile: "gas-report.txt",
      noColors: true,
   },

   solidity: "0.8.8",
   namedAccounts: {
      deployer: {
         default: 0,
      },
      player: {
         default: 1,
      },
   },

   mocha: {
      timeout: 500000,
   },
}
