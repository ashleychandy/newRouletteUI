class GameService {
  constructor() {
    this.RouletteContract = null;
    this.HEADS = 1;
    this.TAILS = 2;
  }

  // Initialize game service with contracts
  init(contracts) {
    if (!contracts) {
      throw new Error('Contracts object not provided');
    }

    // Handle different contract formats
    if (contracts.Roulette) {
      this.RouletteContract = contracts.Roulette;
    } else if (contracts.RouletteContract) {
      this.RouletteContract = contracts.RouletteContract;
    } else {
      throw new Error('Roulette contract not provided');
    }

    // Validate that the contract has the necessary methods
    if (
      !this.RouletteContract.flipCoin ||
      typeof this.RouletteContract.flipCoin !== 'function'
    ) {
      throw new Error('Invalid Roulette contract: missing flipCoin method');
    }

    return this;
  }

  // Play Roulette game
  async playRoulette(chosenSide, amount) {
    if (!this.RouletteContract) {
      throw new Error('Roulette contract not initialized');
    }

    if (
      !chosenSide ||
      (chosenSide !== this.HEADS && chosenSide !== this.TAILS)
    ) {
      throw new Error('Invalid side selected. Choose HEADS (1) or TAILS (2).');
    }

    if (!amount || amount <= 0) {
      throw new Error('Invalid bet amount');
    }

    try {
      const tx = await this.RouletteContract.flipCoin(chosenSide, amount);
      const receipt = await tx.wait();

      return {
        success: true,
        transaction: receipt,
      };
    } catch (error) {
      throw this.parseContractError(error);
    }
  }

  // Parse contract errors
  parseContractError(error) {
    // Check for known error patterns
    const errorString = error.toString();

    if (errorString.includes('insufficient funds')) {
      return new Error('Insufficient funds to place this bet');
    }

    if (errorString.includes('user rejected')) {
      return new Error('Transaction rejected by user');
    }

    if (errorString.includes('Invalid chosen side')) {
      return new Error('Please choose HEADS (1) or TAILS (2)');
    }

    if (errorString.includes('Bet amount cannot be zero')) {
      return new Error('Bet amount cannot be zero');
    }

    if (errorString.includes('Bet amount too large')) {
      return new Error('Bet amount exceeds the maximum allowed');
    }

    if (errorString.includes('Token burn failed')) {
      return new Error('Failed to place bet. Token transfer issue.');
    }

    if (errorString.includes('InsufficientUserBalance')) {
      return new Error('Insufficient token balance');
    }

    if (errorString.includes('InsufficientAllowance')) {
      return new Error(
        'Insufficient token allowance. Please approve tokens first.'
      );
    }

    if (errorString.includes('execution reverted')) {
      return new Error('Transaction failed. Please try again.');
    }

    // Default error
    return new Error(
      'Failed to place bet: ' + (error.message || 'Unknown error')
    );
  }

  // Calculate potential payout
  calculatePotentialPayout(amount) {
    if (!amount) return BigInt(0);
    return amount * BigInt(2);
  }
}

export default new GameService();
