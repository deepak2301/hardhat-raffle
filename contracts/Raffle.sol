// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";
/**TODO in raffle.sol
 * Enter the lottery(By paying some amount)
 * pick a andom winner (verifyably random)
 * winner to be selected every (1h,4h,1dayetc)-> compeletly automatic
 * To get this random users and to make it automatic we will use
 * chainlink orcle for randomness,automated execution using (chainlink keeper)
 */
error Raffle__NotEnoughEth();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__UpkeepNotNeeded(
   uint256 currentBalance,
   uint256 numPlayers,
   uint256 raffleState
);

/**
 * @title Basic Raffle Contract
 * @author Deepak Mishra
 * @notice This contrat is for creating an untamperable decetralized smart contract
 * @dev This implements ChainLink VRF2 and Chainlink keepers
 */

contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
   /* Type Declarations */
   enum RaffleState {
      OPEN,
      CALCULATING
   }

   /*State variables */
   uint256 private immutable i_entryFees;
   address payable[] private s_players;
   VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
   bytes32 private immutable i_gasLane;
   uint64 private immutable i_subscriptionId;
   uint16 private constant REQUEST_CONFIRMSTIONS = 3;
   uint32 private immutable i_callbackGasLimit;
   uint32 private constant NUM_WORDS = 1;

   /* Lottery variables */
   address private s_recentWinners;
   RaffleState private s_raffleState;
   uint256 private s_lastTimeStamp;
   uint256 immutable i_interval;

   /* Events  */
   event RaffleEnter(address indexed player);
   event RequestedRaffleWinner(uint256 indexed requestId);
   event WinnerPicked(address indexed winner);

   constructor(
      address vrfCoordinatorV2,
      uint256 entryFee,
      bytes32 gasLane,
      uint64 subscriptionId,
      uint32 callbackGasLimit,
      uint256 interval
   ) VRFConsumerBaseV2(vrfCoordinatorV2) {
      i_entryFees = entryFee;
      i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
      i_gasLane = gasLane;
      i_subscriptionId = subscriptionId;
      i_callbackGasLimit = callbackGasLimit;
      s_raffleState = RaffleState.OPEN;
      s_lastTimeStamp = block.timestamp;
      i_interval = interval;
   }

   /* Finctions */

   function enterRaffle() public payable {
      //we will not use require (msg.value>i_entryfees,"not enough eth")
      //we will use below line to reduce gas fees
      if (msg.value < i_entryFees) {
         revert Raffle__NotEnoughEth();
      }
      if (s_raffleState != RaffleState.OPEN) {
         revert Raffle__NotOpen();
      }

      s_players.push(payable(msg.sender));
      // events
      //Emit an event when we update a dynamic arry or mapping
      // best event practice is to => name events with function name reversed
      emit RaffleEnter(msg.sender);
   }

   /**
    * @dev This is the function that the chainlink Keeper nodes call
    * they look for the `upKeepNeeded` to return true
    * The following should be true in order to return true
    * 1.Our Time interval should have passed
    * 2.The lottery should have atleast 1 player, and have some ETH
    * 3.Our subscription is funded with link
    * 4.The Lottery Should be in an "Open" state
    */
   function checkUpkeep(
      bytes memory /*checkData*/
   )
      public
      override
      returns (bool upkeepNeeded, bytes memory /*performdata */)
   {
      bool isOpen = (RaffleState.OPEN == s_raffleState);
      bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
      bool hasPlayers = (s_players.length > 0);
      bool hasBalance = address(this).balance > 0;
      upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
      //(block.timestamp - last block timestamp) > interval
   }

   function performUpkeep(bytes calldata /*performData */) external override {
      //To Pick Random no we need to request the random number
      //once we get it, do something with it
      //chainlink vrf os a 2 transaction process
      (bool upkeepNeeded, ) = checkUpkeep("");
      if (!upkeepNeeded) {
         revert Raffle__UpkeepNotNeeded(
            address(this).balance,
            s_players.length,
            uint256(s_raffleState)
         );
      }

      s_raffleState = RaffleState.CALCULATING;
      uint256 requestId = i_vrfCoordinator.requestRandomWords(
         i_gasLane, //or we can call it keyhash
         i_subscriptionId,
         REQUEST_CONFIRMSTIONS,
         i_callbackGasLimit,
         NUM_WORDS
      );
      emit RequestedRaffleWinner(requestId);
   }

   function fulfillRandomWords(
      uint256 /*requestId*/,
      uint256[] memory randomWords
   ) internal override {
      //s_players size is 10
      // randomNumber is 200 so how we will get random winnner from players array
      uint256 indexOfWinner = randomWords[0] % s_players.length;
      address payable recentWinner = s_players[indexOfWinner];
      s_recentWinners = recentWinner;
      s_raffleState = RaffleState.OPEN;
      s_players = new address payable[](0);
      s_lastTimeStamp = block.timestamp;
      (bool success, ) = recentWinner.call{value: address(this).balance}("");
      if (!success) {
         revert Raffle__TransferFailed();
      }
      emit WinnerPicked(recentWinner);
   }

   /*View /Pure functions */

   // function to check entryfees
   function getEntryFee() public view returns (uint256) {
      return i_entryFees;
   }

   function getPlayer(uint256 index) public view returns (address) {
      return s_players[index];
   }

   function getRecentWinner() public view returns (address) {
      return s_recentWinners;
   }

   function getRaffleState() public view returns (RaffleState) {
      return s_raffleState;
   }

   function getNumWords() public pure returns (uint256) {
      return NUM_WORDS;
   }

   function getNumberOfPlayers() public view returns (uint256) {
      return s_players.length;
   }

   function getLatestTimeStamp() public view returns (uint256) {
      return s_lastTimeStamp;
   }

   function getRequestConfrimations() public pure returns (uint256) {
      return REQUEST_CONFIRMSTIONS;
   }

   function getInterval() public view returns (uint256) {
      return i_interval;
   }
}
