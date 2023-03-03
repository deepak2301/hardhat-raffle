const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const {
   developmentChains,
   networkConfig,
} = require("../../helper-hardhat-config")
//* describe can't work with promises so we dont need to make the async function

!developmentChains.includes(network.name)
   ? describe.skip
   : describe("Raffle Unit Tests", function () {
        let raffle, vrfCoordinatorV2Mock, raffleEntryFee, deployer, interval

        const chainId = network.config.chainId

        beforeEach(async () => {
           deployer = (await getNamedAccounts()).deployer
           await deployments.fixture(["all"])
           raffle = await ethers.getContract("Raffle", deployer)
           raffleEntryFee = await raffle.getEntryFee()
           vrfCoordinatorV2Mock = await ethers.getContract(
              "VRFCoordinatorV2Mock",
              deployer
           )
           interval = await raffle.getInterval()
        })
        describe("Constructor", async () => {
           it("initialisez the raffle correctly", async () => {
              //*ideally we make out tests have just 1 assert per "it"
              const raffleState = await raffle.getRaffleState()

              const lastestTimeStamp = await raffle.getLatestTimeStamp()
              assert.equal(raffleState.toString(), "0")
              assert.equal(
                 interval.toString(),
                 networkConfig[chainId]["interval"]
              )
           })
        })
        //* test to check if user has enough fund and if not revert it
        describe("Enter Raffle", function () {
           it("reverts when you don't pay enough", async () => {
              await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
                 raffle,
                 "Raffle__NotEnoughEth"
              )
           })

           it("Record Players when they enter in raffle", async () => {
              await raffle.enterRaffle({ value: raffleEntryFee })
              //* we need to check deployer is in our contract
              const playerFromContract = await raffle.getPlayer(0)
              assert.equal(playerFromContract, deployer) //* [player from the contract should be deployer]
           })
           it("tests if the emit is working fine", async () => {
              await expect(
                 raffle.enterRaffle({ value: raffleEntryFee })
              ).to.emit(raffle, "RaffleEnter") //* Emit "RaffleEnter from raffle contract"
           })
           it("Should not allow entrance if raffleState is clculating ", async () => {
              await raffle.enterRaffle({ value: raffleEntryFee })
              //*here we are increasing the time by whatever interval is by using evm_increaseTime Method
              await network.provider.send("evm_increaseTime", [
                 interval.toNumber() + 1,
              ])
              await network.provider.send("evm_mine", []) //*  mine 1 vlock extra

              //* we prtend to be a chainlink keeper
              await raffle.performUpkeep(
                 [] /*  pass a call data "Empty array" */
              )
              await expect(
                 raffle.enterRaffle({ value: raffleEntryFee })
              ).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen")
           })
        })
        describe("checkUpkeep", function () {
           it("returns false if people haven't send eth", async () => {
              await network.provider.send("evm_increaseTime", [
                 interval.toNumber() + 1,
              ])
              await network.provider.send("evm_mine", [])
              const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
              assert(!upkeepNeeded)
           })
           it("should return flase if raffle isn't open", async () => {
              await raffle.enterRaffle({ value: raffleEntryFee })
              await network.provider.send("evm_increaseTime", [
                 interval.toNumber() + 1,
              ])
              await network.provider.send("evm_mine", [])
              await raffle.performUpkeep([])
              const raffleState = await raffle.getRaffleState()
              const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
              assert.equal(raffleState.toString(), "1")
              assert.equal(upkeepNeeded, false)
           })
        })
        describe("perfromupkeep", function () {
           it("it can only run if checkUpkeep is true", async () => {
              await raffle.enterRaffle({ value: raffleEntryFee })
              await network.provider.send("evm_increaseTime", [
                 interval.toNumber() + 1,
              ])
              await network.provider.send("evm_mine", [])
              const tx = await raffle.performUpkeep([])
              assert(tx)
           })
           it("it reverts if checkUpeep is false", async () => {
              await expect(
                 raffle.performUpkeep([])
              ).to.be.revertedWithCustomError(raffle, "Raffle__UpkeepNotNeeded")
           })
           it("updates the raffle state,emits and event, and call vrfcoordinator", async () => {
              await raffle.enterRaffle({ value: raffleEntryFee })
              await network.provider.send("evm_increaseTime", [
                 interval.toNumber() + 1,
              ])
              await network.provider.send("evm_mine", [])
              const txResponse = await raffle.performUpkeep([])
              const txReceipt = await txResponse.wait(1)
              const requestId = txReceipt.events[1].args.requestId
              const raffleState = await raffle.getRaffleState()
              assert(requestId.toNumber() > 0)
              assert(raffleState.toString() == "1")
           })
        })
        describe("fulfillRandomWords", function () {
           //* before we do any test of fulfillrandomWords we need somebody to have enter our raffle
           beforeEach(async () => {
              await raffle.enterRaffle({ value: raffleEntryFee })
              await network.provider.send("evm_increaseTime", [
                 interval.toNumber() + 1,
              ])
              await network.provider.send("evm_mine", [])
           })
           it("Can only be called after performUpkeep", async () => {
              await expect(
                 vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
              ).to.be.reverted

              await expect(
                 vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
              ).to.be.reverted
           })
           it("Seletct Random winner, Resets the raffle,send money to winner", async () => {
              const additionalAccounts = 3
              const startingAccountIndex = 2
              const accounts = await ethers.getSigners()

              for (
                 let i = startingAccountIndex;
                 i < startingAccountIndex + additionalAccounts;
                 i++
              ) {
                 const accountConnectedRaffle = raffle.connect(accounts[i])
                 await accountConnectedRaffle.enterRaffle({
                    value: raffleEntryFee,
                 })
              }
              //* keeping note of starting timestamp
              const startingTimeStamp = await raffle.getLatestTimeStamp()

              // Tasks to test
              //performUpkeep (mock being chainlink keepers)
              // fuldillRandomWords (mock being the chainlink VRF)
              // we will have to wait for the fulfillRandomWords to be called

              await new Promise(async (resolve, reject) => {
                 raffle.once("WinnerPicked", async () => {
                    console.log("Found the Event!")
                    try {
                       const recentWinner = await raffle.getRecentWinner()

                       const raffleState = await raffle.getRaffleState()
                       const endingTimeStamp = await raffle.getLatestTimeStamp()
                       const numPlayers = await raffle.getNumberOfPlayers()
                       const winnerEndingBalance =
                          await accounts[2].getBalance()
                       assert.equal(numPlayers.toString(), "0")
                       assert.equal(raffleState.toString(), "0")

                       assert(endingTimeStamp > startingTimeStamp)

                       //*Funding the raffle Winner
                       assert.equal(
                          winnerEndingBalance.toString(),
                          winnerStartingBalance.add(
                             raffleEntryFee
                                .mul(additionalAccounts)
                                .add(raffleEntryFee)
                                .toString()
                          )
                       )
                    } catch (e) {
                       reject(e)
                    }
                    resolve()
                 })
                 //* setting up the listener
                 //* below we will fire the event and listner will pick it up and resolve
                 const tx = await raffle.performUpkeep([])
                 const txReceipt = await tx.wait(1)
                 const winnerStartingBalance = await accounts[2].getBalance()
                 await vrfCoordinatorV2Mock.fulfillRandomWords(
                    txReceipt.events[1].args.requestId,
                    raffle.address
                 )
              })
           })
        })
     })
