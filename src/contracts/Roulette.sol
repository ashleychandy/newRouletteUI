// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "lib/contractsv2/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "lib/contractsv2/src/v0.8/VRFConsumerBaseV2.sol";

/**
 * @title IERC20
 * @dev ERC20 interface with role-based functionality
 */
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function hasRole(bytes32 role, address account) external view returns (bool);
    function getRoleAdmin(bytes32 role) external view returns (bytes32);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address callerConfirmation) external;
    function mint(address account, uint256 amount) external;
    function controlledBurn(uint256 amount) external;
    function controlledBurnFrom(address account, uint256 amount) external;
    function getRemainingMintable() external view returns (uint256);
}

/**
 * @title Bet Type Enumeration
 * @dev Defines all possible betting options in roulette
 */
enum BetType {
    Straight,    // Single number bet
    Dozen,       // 12 numbers (1-12, 13-24, 25-36)
    Column,      // 12 numbers (vertical 2:1)
    Red,         // Red numbers
    Black,       // Black numbers
    Even,        // Even numbers
    Odd,         // Odd numbers
    Low,         // 1-18
    High         // 19-36
}

/**
 * @title Bet Details Structure
 * @dev Stores details for an individual bet within a spin
 */
struct BetDetails {
    BetType betType;       // Type of bet placed
    uint8[] numbers;       // Numbers covered by the bet
    uint256 amount;        // Amount wagered
    uint256 payout;        // Amount won (0 if lost)
}

/**
 * @title Bet Structure
 * @dev Records a complete roulette spin with multiple possible bets
 */
struct Bet {
    uint256 timestamp;     // When the bet was placed
    BetDetails[] bets;     // Array of individual bets
    uint8 winningNumber;   // The result number (0-36)
    bool completed;        // Whether the spin is completed
    bool isActive;         // Whether the spin is still active
}

/**
 * @title User Game Data Structure
 * @dev Maintains game state and bet history for each player
 */
struct UserGameData {
    Bet[] recentBets;              // Historical bets (limited size)
    uint256 maxHistorySize;        // Maximum size of history to keep
    uint256 currentRequestId;      // VRF request ID for current game
    bool requestFulfilled;         // Whether the VRF request is fulfilled
    uint256 lastPlayedTimestamp;   // Last gameplay timestamp
    uint256 lastPlayedBlock;       // Block number when game was started
    uint8 historyIndex;            // Current index in the circular history buffer
}

/**
 * @title Bet Request Structure
 * @dev Used for incoming bet requests from players
 */
struct BetRequest {
    uint8 betTypeId;     // Bet type ID from constants
    uint8 number;        // Single number for straight bets
    uint256 amount;      // Amount of tokens to bet
}

/**
 * @title Roulette
 * @dev A provably fair roulette game using VRF for randomness
 */
contract Roulette is ReentrancyGuard, Pausable, VRFConsumerBaseV2, Ownable {
    // ============ Events ============
    event BetPlaced(address indexed player, uint256 requestId);
    event GameCompleted(address indexed player, uint256 requestId);
    event GameRecovered(address indexed player, uint256 requestId);

    // ============ Custom Errors ============
    error InvalidBetParameters(string reason);
    error InvalidBetType(uint256 betType);
    error InsufficientUserBalance(uint256 required, uint256 available);
    error TransferFailed(address from, address to, uint256 amount);
    error BurnFailed(address account, uint256 amount);
    error MintFailed(address account, uint256 amount);
    error MissingContractRole(bytes32 role);
    error InsufficientAllowance(uint256 required, uint256 allowed);
    error MaxPayoutExceeded(uint256 potentialPayout, uint256 maxAllowed);

    // ============ Constants ============
    uint8 public constant MAX_NUMBER = 36;
    uint256 public constant DENOMINATOR = 10000;
    uint256 public constant MAX_HISTORY_SIZE = 10;
    uint256 private constant MAX_BETS_PER_SPIN = 15;
    uint256 public constant MAX_BET_AMOUNT = 100_000 * 10**18;     // 100k tokens per bet
    uint256 public constant MAX_TOTAL_BET_AMOUNT = 500_000 * 10**18;  // 500k tokens total per spin
    uint256 public constant MAX_POSSIBLE_PAYOUT = 17_500_000 * 10**18; // 17.5M tokens (500k * 35)
    uint32 private constant GAME_TIMEOUT = 1 hours;
    uint256 private constant BLOCK_THRESHOLD = 300;
    
    // Special result values
    uint8 public constant RESULT_FORCE_STOPPED = 254;
    uint8 public constant RESULT_RECOVERED = 255;
    
    // Token-related constants
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    // Bet type number mappings for frontend
    uint8 public constant STRAIGHT_BET = 0;
    uint8 public constant DOZEN_BET_FIRST = 1;    // 1-12
    uint8 public constant DOZEN_BET_SECOND = 2;   // 13-24
    uint8 public constant DOZEN_BET_THIRD = 3;    // 25-36
    uint8 public constant COLUMN_BET_FIRST = 4;   // 1,4,7...
    uint8 public constant COLUMN_BET_SECOND = 5;  // 2,5,8...
    uint8 public constant COLUMN_BET_THIRD = 6;   // 3,6,9...
    uint8 public constant RED_BET = 7;
    uint8 public constant BLACK_BET = 8;
    uint8 public constant EVEN_BET = 9;
    uint8 public constant ODD_BET = 10;
    uint8 public constant LOW_BET = 11;
    uint8 public constant HIGH_BET = 12;

    // ============ State Variables ============
    // Token contract
    IERC20 public gamaToken;
    
    // Player data
    mapping(address => UserGameData) public userData;
    
    // Game Statistics
    uint256 public totalGamesPlayed;
    uint256 public totalPayoutAmount;
    uint256 public totalWageredAmount;

    // ============ VRF Variables ============
    VRFCoordinatorV2Interface private immutable COORDINATOR;
    uint64 private immutable s_subscriptionId;
    bytes32 private immutable s_keyHash;
    uint32 private immutable callbackGasLimit;
    uint16 private immutable requestConfirmations;
    uint8 private immutable numWords;
    
    // VRF Request tracking
    struct RequestStatus {
        bool fulfilled;
        bool exists;
        uint256[] randomWords;
    }
    mapping(uint256 => RequestStatus) public s_requests;
    mapping(uint256 => address) private requestToPlayer;
    mapping(uint256 => bool) private activeRequestIds;

    // ============ Constructor ============
    /**
     * @notice Contract constructor
     * @param _gamaTokenAddress Address of the token contract
     * @param vrfCoordinator Address of the VRF coordinator
     * @param subscriptionId VRF subscription ID
     * @param keyHash VRF key hash for the network
     * @param _callbackGasLimit Gas limit for VRF callback
     * @param _requestConfirmations Number of confirmations for VRF request
     * @param _numWords Number of random words to request
     */
    constructor(
        address _gamaTokenAddress,
        address vrfCoordinator,
        uint64 subscriptionId,
        bytes32 keyHash,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint8 _numWords
    ) VRFConsumerBaseV2(vrfCoordinator) Ownable(msg.sender) {
        require(_gamaTokenAddress != address(0), "Token address cannot be zero");
        require(vrfCoordinator != address(0), "VRF coordinator cannot be zero");
        require(_callbackGasLimit > 0, "Callback gas limit cannot be zero");
        require(_numWords > 0, "Number of words cannot be zero");
        
        gamaToken = IERC20(_gamaTokenAddress);
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        s_subscriptionId = subscriptionId;
        s_keyHash = keyHash;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        numWords = _numWords;
    }

    // ============ External Functions ============
    /**
     * @notice Place bets on a roulette spin
     * @param betRequests Array of bet requests
     * @return requestId VRF request ID for tracking
     */
    function placeBet(BetRequest[] calldata betRequests) external nonReentrant whenNotPaused returns (uint256 requestId) {
        // ===== CHECKS =====
        // 1. Input validation
        if (betRequests.length == 0) revert InvalidBetParameters("No bets provided");
        if (betRequests.length > MAX_BETS_PER_SPIN) revert InvalidBetParameters("Too many bets");

        // 2. State checks and initial setup
        UserGameData storage user = userData[msg.sender];
        
        // Check if user has an active game or pending request
        if (user.recentBets.length > 0 && user.recentBets[user.recentBets.length - 1].isActive) {
            revert InvalidBetParameters("User has an active game");
        }
        if (user.currentRequestId != 0) {
            revert InvalidBetParameters("User has a pending request");
        }
        
        uint256 totalAmount;
        uint256 maxPossiblePayout;
        
        // 3. Pre-validate all bets and calculate totals in a single pass
        (totalAmount, maxPossiblePayout) = _validateAndCalculateTotals(betRequests);

        // 4. Ensure maximum possible payout doesn't exceed the hardcoded limit
        if (maxPossiblePayout > MAX_POSSIBLE_PAYOUT) {
            revert MaxPayoutExceeded(maxPossiblePayout, MAX_POSSIBLE_PAYOUT);
        }

        // 5. Check if maximum possible payout doesn't exceed remaining mintable amount
        uint256 remainingMintable = gamaToken.getRemainingMintable();
        if (maxPossiblePayout > remainingMintable) {
            revert MaxPayoutExceeded(maxPossiblePayout, remainingMintable);
        }

        // 6. Balance and allowance checks
        _checkBalancesAndAllowances(msg.sender, totalAmount);

        // ===== EFFECTS =====
        // 7. Burn tokens first
        gamaToken.controlledBurnFrom(msg.sender, totalAmount);

        // Update total wagered amount
        totalWageredAmount += totalAmount;

        // 8. Request random number using VRF
        requestId = COORDINATOR.requestRandomWords(
            s_keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );

        // 9. Record the request
        s_requests[requestId] = RequestStatus({
            randomWords: new uint256[](0),
            exists: true,
            fulfilled: false
        });
        
        // 10. Store request mapping
        requestToPlayer[requestId] = msg.sender;
        activeRequestIds[requestId] = true;
        
        // 11. Update timestamp and block number
        user.lastPlayedTimestamp = block.timestamp;
        user.lastPlayedBlock = block.number;
        user.currentRequestId = requestId;
        user.requestFulfilled = false;
        
        // 12. Create a new bet in history
        Bet memory newBet = Bet({
            timestamp: block.timestamp,
            bets: new BetDetails[](betRequests.length),
            winningNumber: 0,
            completed: false,
            isActive: true
        });
        
        // 13. Process all bets
        for (uint256 i = 0; i < betRequests.length; i++) {
            // Convert betTypeId to BetType and get numbers
            (BetType betType, uint8[] memory numbers) = _processBetRequest(betRequests[i]);
            
            // Store bet details in memory array
            newBet.bets[i] = BetDetails({
                betType: betType,
                numbers: numbers,
                amount: betRequests[i].amount,
                payout: 0
            });
        }
        
        // 14. Add the new bet to history
        if (user.recentBets.length < MAX_HISTORY_SIZE) {
            user.recentBets.push(newBet);
        } else {
            // Use circular buffer approach
            uint256 index = user.historyIndex % MAX_HISTORY_SIZE;
            user.recentBets[index] = newBet;
        }
        user.historyIndex++;
        
        emit BetPlaced(msg.sender, requestId);
        
        return requestId;
    }

    // ============ Private Helper Functions ============
    /**
     * @dev Validate all bets and calculate total amount and potential payout
     * @param bets Array of bet requests
     * @return totalAmount Total bet amount
     * @return maxPossiblePayout Maximum possible payout
     */
    function _validateAndCalculateTotals(BetRequest[] calldata bets) private pure returns (uint256 totalAmount, uint256 maxPossiblePayout) {
        for (uint256 i = 0; i < bets.length; i++) {
            // Each bet can have a different amount
            if (bets[i].amount == 0) revert InvalidBetParameters("Invalid bet amount");
            if (bets[i].amount > MAX_BET_AMOUNT) revert InvalidBetParameters("Single bet amount too large");
            
            uint256 newTotal = totalAmount + bets[i].amount;
            if (newTotal < totalAmount) revert InvalidBetParameters("Total amount overflow");
            totalAmount = newTotal;
            
            // Calculate potential payout based on bet type
            (BetType betType,) = _processBetRequest(bets[i]);
            uint256 multiplier = getPayoutMultiplier(betType);
            uint256 potentialPayout = (bets[i].amount * multiplier) / DENOMINATOR;
            
            uint256 newMaxPayout = maxPossiblePayout + potentialPayout;
            if (newMaxPayout < maxPossiblePayout) revert InvalidBetParameters("Max payout overflow");
            maxPossiblePayout = newMaxPayout;
            
            // Ensures total of all bets doesn't exceed MAX_TOTAL_BET_AMOUNT (500k tokens)
            if (totalAmount > MAX_TOTAL_BET_AMOUNT) revert InvalidBetParameters("Total bet amount too large");
        }
    }

    /**
     * @dev Check player balance, allowance, and contract roles
     * @param player Player address
     * @param totalAmount Total amount to check
     */
    function _checkBalancesAndAllowances(address player, uint256 totalAmount) private view {
        if (gamaToken.balanceOf(player) < totalAmount) {
            revert InsufficientUserBalance(totalAmount, gamaToken.balanceOf(player));
        }

        if (gamaToken.allowance(player, address(this)) < totalAmount) {
            revert InsufficientAllowance(totalAmount, gamaToken.allowance(player, address(this)));
        }

        if (!gamaToken.hasRole(BURNER_ROLE, address(this))) {
            revert MissingContractRole(BURNER_ROLE);
        }

        if (!gamaToken.hasRole(MINTER_ROLE, address(this))) {
            revert MissingContractRole(MINTER_ROLE);
        }
    }

    /**
     * @dev Calculate payout for a bet
     * @param numbers Numbers covered by the bet
     * @param betType Type of bet
     * @param betAmount Bet amount
     * @param _winningNumber Winning number
     * @return Payout amount
     */
    function _calculatePayout(uint8[] memory numbers, BetType betType, uint256 betAmount, uint8 _winningNumber) private pure returns (uint256) {
        if (betAmount == 0) return 0;
        if (betAmount > MAX_BET_AMOUNT) revert InvalidBetParameters("Bet amount exceeds maximum");
        
        if (_isBetWinning(numbers, betType, _winningNumber)) {
            uint256 multiplier = getPayoutMultiplier(betType);
            if (multiplier == 0) revert("Invalid multiplier");
            
            // Check for multiplication overflow
            uint256 product = betAmount * multiplier;
            if (product / betAmount != multiplier) revert InvalidBetParameters("Payout calculation overflow");
            
            uint256 winnings = product / DENOMINATOR;
            if (winnings * DENOMINATOR != product) revert InvalidBetParameters("Payout division mismatch");
            
            // Check for addition overflow
            uint256 totalPayout = winnings + betAmount;
            if (totalPayout < winnings) revert InvalidBetParameters("Total payout overflow");
            
            if (totalPayout > MAX_POSSIBLE_PAYOUT) {
                revert MaxPayoutExceeded(totalPayout, MAX_POSSIBLE_PAYOUT);
            }
            
            return totalPayout;
        }
        return 0;
    }

    /**
     * @dev Check if a bet is winning
     * @param numbers Numbers covered by the bet
     * @param betType Type of bet
     * @param _winningNumber Winning number
     * @return True if bet is winning
     */
    function _isBetWinning(uint8[] memory numbers, BetType betType, uint8 _winningNumber) private pure returns (bool) {
        if (_winningNumber > MAX_NUMBER) return false;
        
        if (_winningNumber == 0) {
            return (betType == BetType.Straight && numbers.length == 1 && numbers[0] == 0);
        }
        
        if (betType == BetType.Red) return _isRed(_winningNumber);
        if (betType == BetType.Black) return !_isRed(_winningNumber) && _winningNumber != 0;
        if (betType == BetType.Even) return _winningNumber % 2 == 0 && _winningNumber != 0;
        if (betType == BetType.Odd) return _winningNumber % 2 == 1;
        if (betType == BetType.Low) return _winningNumber >= 1 && _winningNumber <= 18;
        if (betType == BetType.High) return _winningNumber >= 19 && _winningNumber <= 36;
        
        for (uint8 i = 0; i < numbers.length; i++) {
            if (numbers[i] == _winningNumber) return true;
        }
        return false;
    }

    /**
     * @dev Check if a number is red
     * @param number Number to check
     * @return True if number is red
     */
    function _isRed(uint8 number) private pure returns (bool) {
        if (number == 0) return false;
        uint8[18] memory redNumbers = [
            1, 3, 5, 7, 9, 12, 14, 16, 18, 
            19, 21, 23, 25, 27, 30, 32, 34, 36
        ];
        for (uint8 i = 0; i < redNumbers.length; i++) {
            if (redNumbers[i] == number) return true;
        }
        return false;
    }

    /**
     * @dev Get payout multiplier for a bet type
     * @param betType Bet type
     * @return Payout multiplier
     */
    function getPayoutMultiplier(BetType betType) internal pure returns (uint256) {
        // DENOMINATOR = 10000
        if (betType == BetType.Straight) return 35 * DENOMINATOR;     // 35:1 payout (get 35x plus original bet)
        if (betType == BetType.Dozen) return 2 * DENOMINATOR;         // 2:1 payout (get 2x plus original bet)
        if (betType == BetType.Column) return 2 * DENOMINATOR;        // 2:1 payout (get 2x plus original bet)
        if (betType >= BetType.Red && betType <= BetType.High) {
            return DENOMINATOR;                                        // 1:1 payout (get 1x plus original bet)
        }
        revert InvalidBetType(uint256(betType));
    }

    /**
     * @dev Validate bet based on type and numbers
     * @param numbers Numbers covered by the bet
     * @param betType Bet type
     * @return True if bet is valid
     */
    function _isValidBet(uint8[] memory numbers, BetType betType) private pure returns (bool) {
        // Validate number range for relevant bet types
        if (betType == BetType.Straight || betType == BetType.Dozen || betType == BetType.Column) {
            for (uint8 i = 0; i < numbers.length; i++) {
                if (numbers[i] > MAX_NUMBER) return false;
            }
        }

        // Specific validations for each bet type
        if (betType == BetType.Straight) {
            return numbers.length == 1;
        } else if (betType == BetType.Dozen) {
            return _isValidDozen(numbers);
        } else if (betType == BetType.Column) {
            return _isValidColumn(numbers);
        } else if (betType == BetType.Red || betType == BetType.Black || betType == BetType.Even || betType == BetType.Odd || betType == BetType.Low || betType == BetType.High) {
            // For these bet types, the numbers array is ignored
            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Validate dozen bet
     * @param numbers Numbers covered by the bet
     * @return True if dozen bet is valid
     */
    function _isValidDozen(uint8[] memory numbers) private pure returns (bool) {
        if (numbers.length != 12) return false;
        
        // Check if first number is valid starting point for dozens
        uint8 start = numbers[0];
        if (start != 1 && start != 13 && start != 25) return false;
        
        // Ensure numbers are sequential within the dozen
        for (uint8 i = 0; i < 12; i++) {
            if (numbers[i] != start + i) return false;
        }
        
        return true;
    }

    /**
     * @dev Validate column bet
     * @param numbers Numbers covered by the bet
     * @return True if column bet is valid
     */
    function _isValidColumn(uint8[] memory numbers) private pure returns (bool) {
        if (numbers.length != 12) return false;
        
        // Check if numbers form a valid column based on the visual layout
        // Column 1 (right): 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36
        // Column 2 (middle): 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35
        // Column 3 (left): 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34
        
        uint8[] memory validStarts = new uint8[](3);
        validStarts[0] = 3;
        validStarts[1] = 2;
        validStarts[2] = 1;
        
        bool isValidStart = false;
        uint8 start = numbers[0];
        
        // Check if it starts with a valid column number
        for (uint8 i = 0; i < validStarts.length; i++) {
            if (start == validStarts[i]) {
                isValidStart = true;
                break;
            }
        }
        if (!isValidStart) return false;

        // Validate all numbers in the column
        for (uint8 i = 0; i < 12; i++) {
            uint8 expected = start + (i * 3);
            if (numbers[i] != expected || expected > MAX_NUMBER) return false;
        }
        
        return true;
    }

    /**
     * @dev Get column numbers
     * @param columnStart Starting number for the column
     * @return Array of column numbers
     */
    function _getColumnNumbers(uint8 columnStart) private pure returns (uint8[] memory) {
        uint8[] memory numbers = new uint8[](12);
        for (uint8 i = 0; i < 12; i++) {
            numbers[i] = columnStart + (i * 3);
        }
        return numbers;
    }

    /**
     * @dev Get dozen numbers
     * @param dozenStart Starting number for the dozen
     * @return Array of dozen numbers
     */
    function _getDozenNumbers(uint8 dozenStart) private pure returns (uint8[] memory) {
        uint8[] memory numbers = new uint8[](12);
        for (uint8 i = 0; i < 12; i++) {
            numbers[i] = dozenStart + i;
        }
        return numbers;
    }
    
    /**
     * @dev Convert bet request to bet type and numbers
     * @param bet Bet request
     * @return betType Bet type
     * @return numbers Numbers covered by the bet
     */
    function _processBetRequest(BetRequest calldata bet) private pure returns (
        BetType betType,
        uint8[] memory numbers
    ) {
        if (bet.betTypeId == STRAIGHT_BET) {
            require(bet.number <= MAX_NUMBER, "Invalid number for straight bet");
            numbers = new uint8[](1);
            numbers[0] = bet.number;
            return (BetType.Straight, numbers);
        }
        else if (bet.betTypeId == DOZEN_BET_FIRST) {
            return (BetType.Dozen, _getDozenNumbers(1));
        }
        else if (bet.betTypeId == DOZEN_BET_SECOND) {
            return (BetType.Dozen, _getDozenNumbers(13));
        }
        else if (bet.betTypeId == DOZEN_BET_THIRD) {
            return (BetType.Dozen, _getDozenNumbers(25));
        }
        else if (bet.betTypeId == COLUMN_BET_FIRST) {
            return (BetType.Column, _getColumnNumbers(1));
        }
        else if (bet.betTypeId == COLUMN_BET_SECOND) {
            return (BetType.Column, _getColumnNumbers(2));
        }
        else if (bet.betTypeId == COLUMN_BET_THIRD) {
            return (BetType.Column, _getColumnNumbers(3));
        }
        else if (bet.betTypeId == RED_BET) {
            return (BetType.Red, new uint8[](0));
        }
        else if (bet.betTypeId == BLACK_BET) {
            return (BetType.Black, new uint8[](0));
        }
        else if (bet.betTypeId == EVEN_BET) {
            return (BetType.Even, new uint8[](0));
        }
        else if (bet.betTypeId == ODD_BET) {
            return (BetType.Odd, new uint8[](0));
        }
        else if (bet.betTypeId == LOW_BET) {
            return (BetType.Low, new uint8[](0));
        }
        else if (bet.betTypeId == HIGH_BET) {
            return (BetType.High, new uint8[](0));
        }
        
        revert InvalidBetParameters("Invalid bet type ID");
    }

    /**
     * @dev Get information about a specific bet type
     * @param betTypeId Bet type ID
     * @return name Name of the bet type
     * @return requiresNumber Whether the bet requires a specific number
     * @return multiplier Payout multiplier
     */
    function getBetTypeInfo(uint8 betTypeId) public pure returns (
        string memory name,
        bool requiresNumber,
        uint256 multiplier
    ) {
        if (betTypeId == STRAIGHT_BET) {
            return ("Straight", true, 35 * DENOMINATOR);
        }
        else if (betTypeId == DOZEN_BET_FIRST) {
            return ("First Dozen (1-12)", false, 2 * DENOMINATOR);
        }
        else if (betTypeId == DOZEN_BET_SECOND) {
            return ("Second Dozen (13-24)", false, 2 * DENOMINATOR);
        }
        else if (betTypeId == DOZEN_BET_THIRD) {
            return ("Third Dozen (25-36)", false, 2 * DENOMINATOR);
        }
        else if (betTypeId == COLUMN_BET_FIRST) {
            return ("First Column", false, 2 * DENOMINATOR);
        }
        else if (betTypeId == COLUMN_BET_SECOND) {
            return ("Second Column", false, 2 * DENOMINATOR);
        }
        else if (betTypeId == COLUMN_BET_THIRD) {
            return ("Third Column", false, 2 * DENOMINATOR);
        }
        else if (betTypeId == RED_BET) {
            return ("Red", false, DENOMINATOR);
        }
        else if (betTypeId == BLACK_BET) {
            return ("Black", false, DENOMINATOR);
        }
        else if (betTypeId == EVEN_BET) {
            return ("Even", false, DENOMINATOR);
        }
        else if (betTypeId == ODD_BET) {
            return ("Odd", false, DENOMINATOR);
        }
        else if (betTypeId == LOW_BET) {
            return ("Low (1-18)", false, DENOMINATOR);
        }
        else if (betTypeId == HIGH_BET) {
            return ("High (19-36)", false, DENOMINATOR);
        }
        
        revert InvalidBetParameters("Invalid bet type ID");
    }

    // Get all valid bet types and their info
    function getAllBetTypes() external pure returns (
        uint8[] memory betTypeIds,
        string[] memory names,
        bool[] memory requiresNumbers,
        uint256[] memory payoutMultipliers
    ) {
        betTypeIds = new uint8[](13);
        names = new string[](13);
        requiresNumbers = new bool[](13);
        payoutMultipliers = new uint256[](13);

        for (uint8 i = 0; i < 13; i++) {
            (string memory name, bool requiresNumber, uint256 multiplier) = getBetTypeInfo(i);
            betTypeIds[i] = i;
            names[i] = name;
            requiresNumbers[i] = requiresNumber;
            payoutMultipliers[i] = multiplier;
        }
    }

    // Get user's bet history with pagination
    function getUserBetHistory(
        address player,
        uint256 offset,
        uint256 limit
    ) external view returns (
        Bet[] memory bets,
        uint256 total
    ) {
        Bet[] memory allBets = userData[player].recentBets;
        uint256 totalBets = allBets.length;
        
        if (offset >= totalBets) {
            return (new Bet[](0), totalBets);
        }
        
        uint256 end = offset + limit;
        if (end > totalBets) {
            end = totalBets;
        }
        
        uint256 size = end - offset;
        bets = new Bet[](size);
        
        for (uint256 i = 0; i < size; i++) {
            bets[i] = allBets[offset + i];
        }
        
        return (bets, totalBets);
    }

    // Get detailed info about a specific bet from history
    function getBetDetails(address player, uint256 betIndex) external view returns (
        uint256 timestamp,
        BetDetails[] memory betDetails,
        uint8 resultNumber,
        bool isWin
    ) {
        require(betIndex < userData[player].recentBets.length, "Invalid bet index");
        
        Bet memory bet = userData[player].recentBets[betIndex];
        
        uint256 totalPayout = 0;
        for (uint256 i = 0; i < bet.bets.length; i++) {
            totalPayout += bet.bets[i].payout;
        }
        
        return (
            bet.timestamp,
            bet.bets,
            bet.winningNumber,
            totalPayout > 0
        );
    }

    // Get all possible winning numbers for a bet type
    function getPossibleWinningNumbers(uint8 betTypeId) external pure returns (uint8[] memory numbers) {
        if (betTypeId == STRAIGHT_BET) {
            numbers = new uint8[](37); // 0-36
            for (uint8 i = 0; i <= 36; i++) {
                numbers[i] = i;
            }
        }
        else if (betTypeId == RED_BET) {
            numbers = new uint8[](18);
            uint8[18] memory redNumbers = [
                1, 3, 5, 7, 9, 12, 14, 16, 18, 
                19, 21, 23, 25, 27, 30, 32, 34, 36
            ];
            for (uint8 i = 0; i < 18; i++) {
                numbers[i] = redNumbers[i];
            }
        }
        else if (betTypeId == BLACK_BET) {
            numbers = new uint8[](18);
            uint8[18] memory blackNumbers = [
                2, 4, 6, 8, 10, 11, 13, 15, 17,
                20, 22, 24, 26, 28, 29, 31, 33, 35
            ];
            for (uint8 i = 0; i < 18; i++) {
                numbers[i] = blackNumbers[i];
            }
        }
        else if (betTypeId == EVEN_BET) {
            numbers = new uint8[](18);
            for (uint8 i = 0; i < 18; i++) {
                numbers[i] = (i + 1) * 2;
            }
        }
        else if (betTypeId == ODD_BET) {
            numbers = new uint8[](18);
            for (uint8 i = 0; i < 18; i++) {
                numbers[i] = (i * 2) + 1;
            }
        }
        else if (betTypeId == LOW_BET) {
            numbers = new uint8[](18);
            for (uint8 i = 0; i < 18; i++) {
                numbers[i] = i + 1;
            }
        }
        else if (betTypeId == HIGH_BET) {
            numbers = new uint8[](18);
            for (uint8 i = 0; i < 18; i++) {
                numbers[i] = i + 19;
            }
        }
        else {
            revert InvalidBetParameters("Invalid bet type ID for number generation");
        }
    }

    /**
     * @notice VRF Coordinator callback function
     * @param requestId VRF request identifier
     * @param randomWords Random results from VRF
     */
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override nonReentrant {
        // ===== CHECKS =====
        // 1. Validate VRF request
        RequestStatus storage request = s_requests[requestId];
        if (!request.exists) revert InvalidBetParameters("Request not found");
        if (request.fulfilled) revert InvalidBetParameters("Request already fulfilled");
        if (randomWords.length != numWords) revert InvalidBetParameters("Invalid random words length");

        // 2. Validate player and game state
        address player = requestToPlayer[requestId];
        if (player == address(0)) revert InvalidBetParameters("Invalid player address");
        
        UserGameData storage user = userData[player];
        if (user.currentRequestId != requestId) revert InvalidBetParameters("Request ID mismatch");
        
        // Mark request as fulfilled to prevent race conditions
        request.fulfilled = true;
        request.randomWords = randomWords;
        user.requestFulfilled = true;
        
        // Find the active bet (should be the most recent one)
        if (user.recentBets.length == 0) {
            // Clean up ALL request data and return if no bets found
            delete s_requests[requestId];
            delete requestToPlayer[requestId];
            delete activeRequestIds[requestId];
            user.currentRequestId = 0;
            user.requestFulfilled = false;
            return;
        }
        
        Bet storage currentBet = user.recentBets[user.recentBets.length - 1];
        
        // Check if bet is still active
        if (!currentBet.isActive) {
            // Game already recovered or force-stopped, clean up ALL request data
            delete s_requests[requestId];
            delete requestToPlayer[requestId];
            delete activeRequestIds[requestId];
            user.currentRequestId = 0;
            user.requestFulfilled = false;
            return;
        }

        // ===== EFFECTS =====
        // 3. Generate winning number from VRF result
        uint8 winningNumber = uint8(randomWords[0] % (MAX_NUMBER + 1)); // 0-36
        
        // 4. Update bet with winning number
        currentBet.winningNumber = winningNumber;
        
        // 5. Calculate payouts for each bet
        uint256 totalPayout = 0;
        
        for (uint256 i = 0; i < currentBet.bets.length; i++) {
            BetDetails storage betDetails = currentBet.bets[i];
            
            uint256 payout = _calculatePayout(
                betDetails.numbers,
                betDetails.betType,
                betDetails.amount,
                winningNumber
            );
            
            if (totalPayout + payout < totalPayout) revert("Payout overflow");
            totalPayout += payout;
            
            // Update payout for this bet
            betDetails.payout = payout;
        }
        
        // 6. Mark bet as completed and not active
        currentBet.completed = true;
        currentBet.isActive = false;
        
        // ===== INTERACTIONS =====
        // 7. Process payouts if any wins
        if (totalPayout > 0) {
            gamaToken.mint(player, totalPayout);
            
            // Update total payout amount
            totalPayoutAmount += totalPayout;
        }
        
        // 8. Increment total games played
        unchecked { ++totalGamesPlayed; }
        
        // 9. Clean up request data
        delete requestToPlayer[requestId];
        delete activeRequestIds[requestId];
        delete s_requests[requestId];
        user.currentRequestId = 0;

        emit GameCompleted(player, requestId);
    }

    /**
     * @notice Recover from a stuck game and receive refund
     */
    function recoverOwnStuckGame() external nonReentrant whenNotPaused {
        UserGameData storage user = userData[msg.sender];
        
        // ===== CHECKS =====
        // Check if user has an active bet
        if (user.recentBets.length == 0 || !user.recentBets[user.recentBets.length - 1].isActive) {
            revert InvalidBetParameters("No active game");
        }
        
        Bet storage currentBet = user.recentBets[user.recentBets.length - 1];
        uint256 requestId = user.currentRequestId;

        // Ensure there is a request to recover from
        if (requestId == 0) {
            revert InvalidBetParameters("No pending request to recover");
        }

        // Check for race condition with VRF callback first
        if (s_requests[requestId].fulfilled && 
            (block.number <= user.lastPlayedBlock + 10)) {
            revert InvalidBetParameters("Request just fulfilled, let VRF complete");
        }
        
        // Check if game is stale - with modified conditions
        bool hasBlockThresholdPassed = block.number > user.lastPlayedBlock + BLOCK_THRESHOLD;
        bool hasTimeoutPassed = block.timestamp > user.lastPlayedTimestamp + GAME_TIMEOUT;
        
        // Modified: Only require that the request exists, not that it's processed
        bool hasVrfRequest = requestId != 0 && s_requests[requestId].exists;
        
        // Check eligibility with modified conditions
        if (!hasBlockThresholdPassed || !hasTimeoutPassed || !hasVrfRequest) {
            revert InvalidBetParameters("Game not eligible for recovery yet");
        }

        // ===== EFFECTS =====
        // Calculate total amount to refund
        uint256 refundAmount = 0;
        for (uint256 i = 0; i < currentBet.bets.length; i++) {
            refundAmount += currentBet.bets[i].amount;
        }
        
        if (refundAmount == 0) revert InvalidBetParameters("Nothing to refund");
        
        // Clean up request data
        delete s_requests[requestId];
        delete requestToPlayer[requestId];
        delete activeRequestIds[requestId];
        
        // Update current bet state
        currentBet.completed = true;
        currentBet.isActive = false;
        currentBet.winningNumber = RESULT_RECOVERED;
        
        for (uint256 i = 0; i < currentBet.bets.length; i++) {
            currentBet.bets[i].payout = currentBet.bets[i].amount;
        }
        
        user.currentRequestId = 0;
        user.requestFulfilled = false;

        // ===== INTERACTIONS =====
        // Refund player
        if (!gamaToken.hasRole(MINTER_ROLE, address(this))) {
            revert MissingContractRole(MINTER_ROLE);
        }
        
        gamaToken.mint(msg.sender, refundAmount);
        
        emit GameRecovered(msg.sender, requestId);
    }

    /**
     * @notice Force stop a game and refund the player (admin only)
     * @param player Player address
     */
    function forceStopGame(address player) external onlyOwner nonReentrant {
        UserGameData storage user = userData[player];
        
        // ===== CHECKS =====
        // Check if user has an active bet
        if (user.recentBets.length == 0 || !user.recentBets[user.recentBets.length - 1].isActive) {
            revert InvalidBetParameters("No active game");
        }
        
        Bet storage currentBet = user.recentBets[user.recentBets.length - 1];
        uint256 requestId = user.currentRequestId;

        // Check for race condition with VRF callback first
        if (requestId != 0 && s_requests[requestId].fulfilled && 
            (block.number <= user.lastPlayedBlock + 10)) {
            revert InvalidBetParameters("Request just fulfilled, let VRF complete");
        }

        // Check if game is stale - with modified conditions
        bool hasBlockThresholdPassed = block.number > user.lastPlayedBlock + BLOCK_THRESHOLD;
        bool hasTimeoutPassed = block.timestamp > user.lastPlayedTimestamp + GAME_TIMEOUT;
        
        // Modified: Only require that the request exists, not that it's processed
        bool hasVrfRequest = requestId != 0 && s_requests[requestId].exists;
        
        // Check eligibility with modified conditions
        if (!hasBlockThresholdPassed || !hasTimeoutPassed || !hasVrfRequest) {
            revert InvalidBetParameters("Game not eligible for force stop yet");
        }

        // Calculate total amount to refund
        uint256 refundAmount = 0;
        for (uint256 i = 0; i < currentBet.bets.length; i++) {
            refundAmount += currentBet.bets[i].amount;
        }
        
        if (refundAmount == 0) revert InvalidBetParameters("Nothing to refund");

        // ===== EFFECTS =====
        // Clean up request data
        if (requestId != 0) {
            delete requestToPlayer[requestId];
            delete activeRequestIds[requestId];
            delete s_requests[requestId];
        }

        // Mark game as completed
        currentBet.completed = true;
        currentBet.isActive = false;
        currentBet.winningNumber = RESULT_FORCE_STOPPED;
        
        for (uint256 i = 0; i < currentBet.bets.length; i++) {
            currentBet.bets[i].payout = currentBet.bets[i].amount;
        }
        
        user.currentRequestId = 0;
        user.requestFulfilled = false;

        // ===== INTERACTIONS =====
        // Refund player
        if (!gamaToken.hasRole(MINTER_ROLE, address(this))) {
            revert MissingContractRole(MINTER_ROLE);
        }
        
        gamaToken.mint(player, refundAmount);

        emit GameRecovered(player, requestId);
    }

    /**
     * @notice Pause contract operations
     */
    function pause() external onlyOwner nonReentrant {
        _pause();
    }

    /**
     * @notice Resume contract operations
     */
    function unpause() external onlyOwner nonReentrant {
        _unpause();
    }

    // ============ Player Information Functions ============
    /**
     * @notice Get player for a specific VRF request
     * @param requestId VRF request ID
     * @return Player address
     */
    function getPlayerForRequest(uint256 requestId) external view returns (address) {
        return requestToPlayer[requestId];
    }

    /**
     * @notice Check if player has pending game
     * @param player Player address
     * @return Status of pending request
     */
    function hasPendingRequest(address player) external view returns (bool) {
        UserGameData storage user = userData[player];
        if (user.recentBets.length == 0) {
            return false;
        }
        return user.recentBets[user.recentBets.length - 1].isActive && user.currentRequestId != 0;
    }

    /**
     * @notice Check if player can start new game
     * @param player Player address
     * @return Eligibility status
     */
    function canStartNewGame(address player) external view returns (bool) {
        UserGameData storage user = userData[player];
        if (user.recentBets.length == 0) {
            return true;
        }
        return !user.recentBets[user.recentBets.length - 1].isActive && user.currentRequestId == 0;
    }

    /**
     * @notice Get detailed game status information
     * @param player Player address
     * @return isActive Whether game is active
     * @return isWin Whether player won
     * @return isCompleted Whether game is completed
     * @return winningNumber Result number
     * @return totalAmount Total amount wagered
     * @return totalPayout Total payout received
     * @return requestId VRF request ID
     * @return requestExists Whether request exists
     * @return requestProcessed Whether request was processed
     * @return recoveryEligible Whether game is eligible for recovery
     * @return lastPlayTimestamp Last play timestamp
     */
    function getGameStatus(address player) external view returns (
        bool isActive,
        bool isWin,
        bool isCompleted,
        uint8 winningNumber,
        uint256 totalAmount,
        uint256 totalPayout,
        uint256 requestId,
        bool requestExists,
        bool requestProcessed,
        bool recoveryEligible,
        uint256 lastPlayTimestamp
    ) {
        if (player == address(0)) revert InvalidBetParameters("Invalid player address");
        
        UserGameData storage user = userData[player];
        
        if (user.recentBets.length == 0) {
            return (false, false, false, 0, 0, 0, 0, false, false, false, 0);
        }
        
        Bet storage currentBet = user.recentBets[user.recentBets.length - 1];
        
        isActive = currentBet.isActive;
        isCompleted = currentBet.completed;
        winningNumber = currentBet.winningNumber;
        requestId = user.currentRequestId;
        lastPlayTimestamp = user.lastPlayedTimestamp;
        
        // Calculate total bet amount and payout
        totalAmount = 0;
        totalPayout = 0;
        for (uint256 i = 0; i < currentBet.bets.length; i++) {
            totalAmount += currentBet.bets[i].amount;
            totalPayout += currentBet.bets[i].payout;
        }
        
        // Check if any bet was a win
        isWin = totalPayout > 0 && currentBet.completed;
        
        requestExists = false;
        requestProcessed = false;
        
        // Check request status if ID is valid
        if (requestId != 0) {
            RequestStatus storage request = s_requests[requestId];
            requestExists = request.exists;
            requestProcessed = request.fulfilled;
        }
        
        // Determine recovery eligibility
        recoveryEligible = false;
        if (isActive) {
            // All conditions must be met for recovery eligibility
            bool hasBlockThresholdPassed = block.number > user.lastPlayedBlock + BLOCK_THRESHOLD;
            bool hasTimeoutPassed = block.timestamp > user.lastPlayedTimestamp + GAME_TIMEOUT;
            // Updated to match new recovery condition
            bool hasVrfRequest = requestId != 0 && requestExists;
            
            // Only eligible if ALL conditions are met
            recoveryEligible = hasBlockThresholdPassed && hasTimeoutPassed && hasVrfRequest;
        }
    }
}
