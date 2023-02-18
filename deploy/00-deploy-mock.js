const { network } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")

const BASE_FEE = ethers.utils.parseEther("0.25") //0.25link is cost to get Random no
const GAS_PRICE_LINK = 1e9 // calculated value based on the gas price of the chain
const args = [BASE_FEE, GAS_PRICE_LINK]
module.exports = async function ({ getNamedAccounts, deployments }) {
   const { deploy, log } = deployments
   const { deployer } = await getNamedAccounts()
   const chainId = network.config.chainId

   if (developmentChains.includes(network.name)) {
      log("Local Network detected! Deploying.......")
      await deploy("VRFCoordinatorV2Mock", {
         from: deployer,
         args: args,
         log: true,
         waitConfirmations: network.config.blockConfirmations || 1,
      })
      log("Mocks Deployed!")
      log("-------------------------------------------------")
   }
}
module.exports.tags = ["all", "mocks"]
