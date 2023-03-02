const { ethers } = require("hardhat")

const networkConfig = {
   5: {
      name: "goerli",
      vrfCoordinatorV2: "0x2ca8e0c643bde4c2e08ab1fa0da3401adad7734d",
      entryFee: ethers.utils.parseEther("0.01"),
      gasLane:
         "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
      subscriptionId: "10256",
      callbackGasLimit: "500000",
      interval: "30",
   },
   31337: {
      name: "hardhat",
      entryFee: ethers.utils.parseEther("0.01"),
      gasLane:
         "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
      callbackGasLimit: "500000",
      interval: "30",
   },
   80001: {
      name: "polygonMumbai",
      vrfCoordinatorV2: "0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed",
      linkToken: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
      entranceFee: "100000000000000000", // 0.1 MATIC
      gasLane:
         "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f", // 500 gwei
      subscriptionId: "10256",
      callbackGasLimit: "500000",
      interval: "30",
   },
}

const developmentChains = ["hardhat", "localhost"]

module.exports = {
   networkConfig,
   developmentChains,
}
