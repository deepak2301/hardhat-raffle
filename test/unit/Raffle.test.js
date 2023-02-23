const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const {
   developmentChains,
   networkConfig,
} = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
   ? describe.skip
   : describe("Raffle Unit Tests", async function () {
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
        describe("Enter Raffle", async () => {
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
        describe("checkUpkeep", async () => {
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
           it("returns false if enough time hasn't passed", async () => {
              await raffle.enterRaffle({ value: raffleEntryFee })
              await network.provider.send("evm_increaseTime", [
                 interval.toNumber() - 1,
              ])
              await network.provider.request({ method: "evm_mine", params: [] })
              const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x")
              assert(!upkeepNeeded)
           })
           it("returns true if enough time has passed,has players,eth,and is open", async () => {
              await raffle.enterRaffle({ value: raffleEntryFee })
              await network.provider.send("evm_increaseTime", [
                 interval.toNumber() + 1,
              ])
              await network.provider.request({ method: "evm_mine", params: [] })
              const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x")
              assert(upkeepNeeded)
           })
        })
     })
