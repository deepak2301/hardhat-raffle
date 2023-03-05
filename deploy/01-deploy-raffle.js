const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2")
const { verify } = require("../utils/verify")

module.exports = async function ({ getNamedAccounts, deployments }) {
   const { deploy, log } = deployments
   const { deployer } = await getNamedAccounts()
   const chainId = network.config.chainId

   let vrfCoordinatorV2Address, subscriptionId

   if (developmentChains.includes(network.name)) {
      let vrfCoordinatorV2Mock = await ethers.getContract(
         "VRFCoordinatorV2Mock"
      )
      vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
      const transactionResponse =
         await vrfCoordinatorV2Mock.createSubscription()
      const transactionReceipt = await transactionResponse.wait(1)
      subscriptionId = transactionReceipt.events[0].args.subId
      //*now fund the subscription
      //*usually,you'd need yhe link token on a real network
      await vrfCoordinatorV2Mock.fundSubscription(
         subscriptionId,
         VRF_SUB_FUND_AMOUNT
      )
   } else {
      vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
      subscriptionId = networkConfig[chainId]["subscriptionId"]
   }

   //*Deploy */
   const entryFee = networkConfig[chainId]["entryFee"]
   const gasLane = networkConfig[chainId]["gasLane"]
   const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
   const interval = networkConfig[chainId]["interval"]
   const args = [
      vrfCoordinatorV2Address,
      entryFee,
      gasLane,
      subscriptionId,
      callbackGasLimit,
      interval,
   ]
   const raffle = await deploy("Raffle", {
      from: deployer,
      args: args,
      log: true,
      waitConfirmations: network.config.blockConfirmations || 1,
   })
   log("--------------------------------------")

   if (developmentChains.includes(network.name)) {
      let vrfCoordinatorV2Mock = await ethers.getContract(
         "VRFCoordinatorV2Mock"
      )
      await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address)
      log("Raffle.sol added as a consumer")
   }
}
module.exports.tags = ["all", "raffle"]
