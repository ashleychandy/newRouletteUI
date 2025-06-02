import { motion } from 'framer-motion';
import React, { useState, useEffect, useCallback } from 'react';
import { useCoinFlipNumber } from '../../hooks/useCoinFlipNumber';
import { usePollingService } from '../../services/pollingService';

const COIN_SIDES = {
  HEADS: 1,
  TAILS: 2,
};

/**
 * Simplified CoinFlip Visualizer Component focused only on CoinFlip display
 */
const CoinFlipVisualizer = ({ chosenNumber, isRolling = false }) => {
  const [error, setError] = useState({ hasError: false, message: '' });
  const { gameStatus } = usePollingService();
  const { displayNumber } = useCoinFlipNumber(chosenNumber, isRolling);
  const [shouldRollCoinFlip, setShouldRollCoinFlip] = useState(false);

  // Check if we're waiting for VRF results
  const isWaitingForVRF =
    gameStatus?.isActive &&
    gameStatus?.requestExists &&
    !gameStatus?.requestProcessed;

  // Handle rolling state with cleanup and debounce
  useEffect(() => {
    let mounted = true;
    let timeoutId;

    const stopRolling = () => {
      if (mounted) {
        setShouldRollCoinFlip(false);
      }
    };

    // Start rolling if either the isRolling prop is true OR we're waiting for VRF
    if (isRolling || isWaitingForVRF) {
      setShouldRollCoinFlip(true);

      // Only set timeout if we're rolling from a bet placement, not if waiting for VRF
      if (isRolling && !isWaitingForVRF) {
        // ALWAYS set a hard timeout to stop the rolling after exactly 20 seconds
        timeoutId = setTimeout(() => {
          stopRolling();
        }, 20000); // 20 seconds max
      }
    } else {
      // If not rolling and not waiting for VRF, stop the animation
      stopRolling();
    }

    // Also stop rolling if game status shows request is processed
    if (gameStatus?.requestProcessed) {
      stopRolling();
    }

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isRolling, gameStatus, isWaitingForVRF]);

  // Validate display number
  const validateDisplayNumber = useCallback(num => {
    if (num === undefined || num === null) {
      throw new Error('Display number is required');
    }
    if (isNaN(num)) {
      throw new Error('Display number must be a valid number');
    }
    if (num < COIN_SIDES.HEADS || num > COIN_SIDES.TAILS) {
      throw new Error(`Invalid Coin side: ${num}`);
    }
    return true;
  }, []);

  // Error handling with validation and cleanup
  useEffect(() => {
    let mounted = true;

    const validateAndUpdateError = () => {
      try {
        if (displayNumber !== undefined && displayNumber !== null) {
          validateDisplayNumber(displayNumber);
          if (mounted) {
            setError({ hasError: false, message: '' });
          }
        }
      } catch (err) {
        if (mounted) {
          setError({
            hasError: true,
            message: err.message || 'Error rendering Coin',
          });
        }
      }
    };

    validateAndUpdateError();

    return () => {
      mounted = false;
    };
  }, [displayNumber, validateDisplayNumber]);

  const renderCoinFace = useCallback(side => {
    const isHeadsSide = side === COIN_SIDES.HEADS;

    return (
      <div
        role="img"
        aria-label={`Coin showing ${isHeadsSide ? 'heads' : 'tails'}`}
        className="absolute inset-0 rounded-full flex items-center justify-center overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, #4ade80 0%, #22c55e 80%, #16a34a 100%)',
          boxShadow:
            '0 12px 24px rgba(34, 197, 94, 0.15), 0 6px 12px rgba(34, 197, 94, 0.1), inset 0 2px 4px rgba(255, 255, 255, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.1)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Matte overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 50%, rgba(0,0,0,0.05) 100%)',
            borderRadius: '50%',
          }}
        />

        {/* Letter H or T */}
        <div className="relative z-10">
          <div
            className="text-7xl font-bold"
            style={{
              color: 'rgba(255,255,255,0.95)',
              textShadow: '0 2px 4px rgba(0,0,0,0.15)',
              letterSpacing: '0.05em',
            }}
          >
            {side === COIN_SIDES.HEADS ? 'H' : 'T'}
          </div>
        </div>
      </div>
    );
  }, []);

  if (error.hasError) {
    return (
      <div className="coin-container flex items-center justify-center bg-red-100 border border-red-300 rounded-lg p-4">
        <div className="text-red-700 text-center">
          <p className="font-medium">Error displaying Coin</p>
          <p className="text-sm">{error.message || 'Please try again'}</p>
        </div>
      </div>
    );
  }

  // Determine if we should show tails based on the chosen number
  const isTails = chosenNumber === COIN_SIDES.TAILS;
  const targetRotation = isTails ? 180 : 0;

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center"
      style={{ perspective: '2000px' }}
    >
      <motion.div
        key={shouldRollCoinFlip ? 'rolling' : 'static'}
        className="relative w-48 h-48 rounded-full"
        initial={{ rotateY: 0 }}
        animate={{
          rotateY: shouldRollCoinFlip ? [0, 360, 720, 1080] : targetRotation,
        }}
        transition={
          shouldRollCoinFlip
            ? {
                duration: 3,
                ease: [0.45, 0, 0.55, 1],
                repeat: Infinity,
                repeatType: 'loop',
              }
            : {
                type: 'spring',
                stiffness: 30,
                damping: 20,
                restDelta: 0.001,
              }
        }
        style={{
          transformStyle: 'preserve-3d',
          transformOrigin: 'center center',
        }}
      >
        <div
          className="relative w-full h-full"
          style={{
            transformStyle: 'preserve-3d',
            transformOrigin: 'center center',
          }}
        >
          {/* Heads side */}
          <div
            className="absolute inset-0"
            style={{
              backfaceVisibility: 'hidden',
              transformStyle: 'preserve-3d',
            }}
          >
            {renderCoinFace(COIN_SIDES.HEADS)}
          </div>
          {/* Tails side */}
          <div
            className="absolute inset-0"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              transformStyle: 'preserve-3d',
            }}
          >
            {renderCoinFace(COIN_SIDES.TAILS)}
          </div>
        </div>
      </motion.div>

      {shouldRollCoinFlip && (
        <div className="mt-6 text-center text-sm text-secondary-600">
          {isWaitingForVRF ? 'Waiting for VRF result...' : 'Flipping coin...'}
        </div>
      )}
    </div>
  );
};

export default CoinFlipVisualizer;
