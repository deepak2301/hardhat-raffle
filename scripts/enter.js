const { ethers } = require("hardhat")

async function enterRaffle() {
   const raffle = await ethers.getContract("Raffle")
   const entryFee = await raffle.getEntryFee()
   await raffle.enterRaffle({ value: entryFee + 1 })
   console.log("Entered!")
}

enterRaffle()
   .then(() => process.exit(0))
   .catch((error) => {
      console.error(error)
      process.exit(1)
   })
