import { useState, useEffect, useCallback } from 'react';
import { useContractConstants } from './useContractConstants.js';
import { usePollingService } from '../services/pollingService.jsx';

/**
 * Simplified custom hook to manage CoinFlip side display
 *
 * @param {Object|null} result - The game result object
 * @param {Number|null} chosenNumber - The side chosen by the player (1=HEADS, 2=TAILS)
 * @param {Boolean} isRolling - Whether the Coin is currently flipping
 * @returns {Object} - The Coin side to display
 */
export const useCoinFlipNumber = (result, chosenNumber, isRolling) => {
  const { constants } = useContractConstants();
  const { gameStatus } = usePollingService();

  // State for Coin side management
  const [randomCoinSide, setRandomCoinSide] = useState(1);
  const [flippedSide, setFlippedSide] = useState(null);
  const [lastFlippedSide, setLastFlippedSide] = useState(null);

  // Constants for coin sides
  const HEADS = 1;
  const TAILS = 2;
  const MIN_COIN_SIDE = HEADS;
  const MAX_COIN_SIDE = TAILS;

  // Initialize state from game status on component mount
  useEffect(() => {
    if (gameStatus && gameStatus.isActive) {
      // If we have a chosen number from contract, update state
      if (gameStatus.chosenNumber) {
        // Store the chosen side as the last flipped side if we don't have a result yet
        setLastFlippedSide(gameStatus.chosenNumber);
      }
    }
  }, [gameStatus]);

  // Get random coin side (either 1 or 2)
  const getRandomCoinSide = useCallback(
    () => Math.floor(Math.random() * 2) + 1, // Returns either 1 (HEADS) or 2 (TAILS)
    []
  );

  // Update random coin side when flipping
  useEffect(() => {
    let intervalId;
    let timeoutId;

    if (isRolling && !flippedSide) {
      // Create a flipping effect by changing the side rapidly
      intervalId = setInterval(() => {
        setRandomCoinSide(getRandomCoinSide());
      }, 150); // Change side every 150ms for a realistic flipping effect

      // Automatically stop flipping after 15 seconds
      timeoutId = setTimeout(() => {
        if (intervalId) {
          clearInterval(intervalId);
        }
      }, 15000); // 15 seconds maximum
    }

    // Clean up interval and timeout
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isRolling, flippedSide, getRandomCoinSide]);

  // Handle the result when it arrives
  useEffect(() => {
    if (result) {
      // Extract the correct side from the result object
      let resultSide = null;

      if (result.rolledNumber !== undefined) {
        resultSide =
          typeof result.rolledNumber === 'string'
            ? parseInt(result.rolledNumber, 10)
            : Number(result.rolledNumber);
      } else if (result.number !== undefined) {
        resultSide =
          typeof result.number === 'string'
            ? parseInt(result.number, 10)
            : Number(result.number);
      } else if (typeof result === 'number') {
        resultSide = result;
      }

      // Validate the result number is not NaN
      if (isNaN(resultSide)) {
        resultSide = null;
      }

      // Only update the flipped side if we have a valid result
      if (resultSide !== null) {
        setFlippedSide(resultSide);
      }

      // Store the last valid flipped side (1-2)
      if (resultSide >= MIN_COIN_SIDE && resultSide <= MAX_COIN_SIDE) {
        setLastFlippedSide(resultSide);
      }
    } else {
      // Reset state when no result, but keep lastFlippedSide
      setFlippedSide(null);
    }
  }, [result]);

  // Function to get the side to display on the Coin
  const getDisplayNumber = () => {
    // If we have a result, show the actual flipped side
    if (flippedSide !== null) {
      // If special result (254 or 255), show a default side or last flipped
      if (
        flippedSide === constants.RESULT_RECOVERED ||
        flippedSide === constants.RESULT_FORCE_STOPPED
      ) {
        // For special results, use the last valid Coin side or default to HEADS
        return lastFlippedSide || HEADS;
      }

      // Make sure we only return valid Coin sides (1-2)
      if (flippedSide >= MIN_COIN_SIDE && flippedSide <= MAX_COIN_SIDE) {
        return flippedSide;
      }

      // For any other invalid side, show last valid flip or chosen side
      if (
        lastFlippedSide >= MIN_COIN_SIDE &&
        lastFlippedSide <= MAX_COIN_SIDE
      ) {
        return lastFlippedSide;
      }

      if (chosenNumber >= MIN_COIN_SIDE && chosenNumber <= MAX_COIN_SIDE) {
        return chosenNumber;
      }

      // Last resort - show HEADS
      return HEADS;
    }

    // If flipping but no result yet, show random side
    if (isRolling) {
      return randomCoinSide;
    }

    // If we have a previous flip, show that side if it's valid
    if (lastFlippedSide >= MIN_COIN_SIDE && lastFlippedSide <= MAX_COIN_SIDE) {
      return lastFlippedSide;
    }

    // If we have a chosen side, show that if it's valid
    if (chosenNumber >= MIN_COIN_SIDE && chosenNumber <= MAX_COIN_SIDE) {
      return chosenNumber;
    }

    // Default to HEADS
    return HEADS;
  };

  return {
    // Only return the display side, everything else is managed by the component
    displayNumber: getDisplayNumber(),
  };
};
