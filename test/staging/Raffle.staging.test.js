const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const {
    isCallTrace,
} = require("hardhat/internal/hardhat-network/stack-traces/message-trace")
const {
    developmentChains,
    networkConfig,
} = require("../../helper-hardhat-config")
//* describe can't work with promises so we dont need to make the async function

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let raffle, raffleEntryFee, deployer

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployers
              raffle = await ethers.getContract("Raffle", deployer)
              raffleEntryFee = await raffle.getEntryFee()
          })
          describe("fulfillRandomWords", function () {
              it("Works with live ChainlinkKeeprs and ChainLink VRF,we get a random winnner", async () => {
                  //* Enter the raffle
                  const startingTimeStamp = await raffle.getLatestTimeSTamp()
                  const accounts = await ethers.getSigners()

                  await new Promise(async (resolve, reject) => {
                      //*setup listener before we enter the raffle
                      //* just in case the blockchain moves really fast
                      raffle.once("Winner Picked", async () => {
                          console.log("Winner Picked event fired!")

                          try {
                              //* add asserts
                              const recentWinner =
                                  await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerEndingBalance =
                                  await accounts[0].getBalance()
                              const endingTimeStamp =
                                  await raffle.getLatestTimeStamp()

                              assert.expect(raffle.getPlayer(0)).to.be.reverted
                              assert.equal(
                                  recentWinner.toString(),
                                  accounts[0].address
                              )
                              assert.equal(raffleState, 0)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance
                                      .add(raffleEntryFee)
                                      .toString()
                              )
                              assert.equal(endingTimeStamp > startingTimeStamp)
                              resolve()
                          } catch (error) {
                              console.log(error)
                              reject(e)
                          }
                      })
                      //* Then entering the raffle
                      await raffle.enterraffle({ value: raffleEntryFee })
                      const winnerStartingBalance =
                          await accounts[0].getBalance()
                      //* This block of code WONT complete until listener has finished listening
                  })
              })
          })
      })
