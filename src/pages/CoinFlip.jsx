import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import {
  faRandom,
  faCoins,
  faCubes,
  faChartLine,
  faChevronDown,
  faChevronUp,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Import components
import BalancePanel from '../components/CoinFlip/BalancePanel.jsx';
import BetInput from '../components/CoinFlip/BetInput.jsx';
import CoinFlipVisualizer from '../components/CoinFlip/CoinFlipVisualizer.jsx';
import LatestBet from '../components/CoinFlip/LatestBet.jsx';
import GameHistory from '../components/CoinFlip/GameHistory.jsx';
import NumberSelector from '../components/CoinFlip/NumberSelector.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { VrfRecoveryModal } from '../components/vrf/index.jsx';
import { useWallet } from '../components/wallet/WalletProvider.jsx';
import ApprovalGuide from '../components/CoinFlip/ApprovalGuide.jsx';

// Import custom hooks
import useGameLogic from '../hooks/useGameLogic.js';

// Import the pollingService to force a refresh when page loads
import { usePollingService } from '../services/pollingService.jsx';

import '../index.css';

const WelcomeBanner = ({ onConnectClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="backdrop-blur-md bg-white/40 rounded-2xl p-8 shadow-lg border border-[#22AD74]/20 mb-8 relative overflow-hidden"
  >
    {/* Decorative elements that complement the site's green-to-white gradient */}
    <div className="absolute top-0 right-0 w-64 h-64 bg-[#22AD74]/10 rounded-full blur-3xl -mr-32 -mt-32 opacity-60"></div>
    <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#22AD74]/15 rounded-full blur-2xl -ml-20 -mb-20 opacity-60"></div>
    <div className="absolute top-1/2 left-1/3 w-20 h-20 bg-[#22AD74]/10 rounded-full blur-xl opacity-40"></div>

    <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-[#22AD74]/30 backdrop-blur-sm rounded-full shadow-sm">
            <FontAwesomeIcon
              icon={faCoins}
              className="text-[#22AD74] text-xl"
            />
          </div>
          <h2 className="text-3xl font-bold text-[#22AD74] bg-clip-text text-transparent bg-gradient-to-r from-[#22AD74] to-[#22AD74]/70">
            Welcome to GAMA FLIP
          </h2>
        </div>

        <p className="text-gray-700 mb-5 text-lg">
          Choose your number, place your bet, and flip the Coin for a chance to
          win up to 2x your stake!
        </p>

        <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-[#22AD74]/15 mb-4 shadow-sm">
          <h3 className="font-semibold text-[#22AD74] mb-3 flex items-center gap-2">
            <FontAwesomeIcon icon={faCubes} className="text-[#22AD74]" />
            How to Play:
          </h3>
          <ul className="grid gap-2.5 text-gray-600">
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#22AD74]/20 flex items-center justify-center text-xs text-[#22AD74] font-bold shadow-inner">
                1
              </div>
              <span>Connect your wallet to start playing</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#22AD74]/20 flex items-center justify-center text-xs text-[#22AD74] font-bold shadow-inner">
                2
              </div>
              <span>Bet with GAMA tokens on your chosen number</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#22AD74]/20 flex items-center justify-center text-xs text-[#22AD74] font-bold shadow-inner">
                3
              </div>
              <span>Win instantly when the Coin Flips</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex-shrink-0">
        <motion.button
          onClick={onConnectClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-8 py-4 bg-gradient-to-r from-[#22AD74] to-[#22AD74]/80 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-medium flex items-center gap-3"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z"
              clipRule="evenodd"
            />
          </svg>
          Connect Wallet
        </motion.button>
      </div>
    </div>
  </motion.div>
);

const CoinFlipPage = ({ contracts, account, onError, addToast }) => {
  const [lastBetAmount, setLastBetAmount] = useState(null);
  const [lastBetDetails, setLastBetDetails] = useState(null);
  const queryClient = useQueryClient();
  const [isVrfModalOpen, setIsVrfModalOpen] = useState(false);
  const { connectWallet, isWalletConnected } = useWallet();

  // Get game status for VRF recovery and use the refreshData function
  const {
    gameStatus,
    refreshData,
    isLoading: _isStatusLoading,
  } = usePollingService();

  // Force refresh data when component mounts to ensure VRF state is current
  useEffect(() => {
    // Immediately refresh data when the component mounts
    refreshData();

    // Set up a periodic refresh every 10 seconds to keep the VRF state current
    const refreshInterval = setInterval(() => {
      if (
        gameStatus?.isActive &&
        gameStatus?.requestExists &&
        !gameStatus?.requestProcessed
      ) {
        refreshData();
      }
    }, 10000);

    return () => clearInterval(refreshInterval);
  }, [refreshData, gameStatus]);

  // Determine if the VRF recovery button should be shown
  const showVrfButton =
    gameStatus?.isActive &&
    (gameStatus?.recoveryEligible ||
      (gameStatus?.lastPlayTimestamp &&
        gameStatus?.requestExists &&
        !gameStatus?.requestProcessed));

  // Use our custom game logic hook
  const {
    chosenNumber,
    betAmount,
    gameState,
    balanceData,
    balanceLoading,
    hasNoTokens,
    needsApproval,
    isApproving,
    isBetting,
    setChosenNumber,
    setBetAmount,
    handleApproveToken,
    handlePlaceBet,
  } = useGameLogic(contracts, account, onError, addToast);

  // Convert between UI representation (heads/tails) and contract values (1/2)
  const handleCoinSideSelected = side => {
    // HEADS = 1, TAILS = 2 in the contract
    setChosenNumber(side === 'heads' ? 1 : 2);
  };

  // Get current UI value from contract value
  const getCurrentSelectedSide = () => {
    if (chosenNumber === 1) return 'heads';
    if (chosenNumber === 2) return 'tails';
    return null;
  };

  // When bet is placed, immediately update UI with the result
  useEffect(() => {
    if (gameState.lastResult) {
      // Store last bet details for LatestBet component
      setLastBetDetails({
        result: gameState.lastResult,
        chosenNumber,
        betAmount,
      });
    }
  }, [gameState.lastResult, chosenNumber, betAmount]);

  // Store last bet amount when a bet is placed
  useEffect(() => {
    if (betAmount > BigInt(0) && !gameState.isProcessing) {
      setLastBetAmount(betAmount);
    }
  }, [betAmount, gameState.isProcessing]);

  // Handle repeat last bet
  const handleRepeatLastBet = useCallback(() => {
    if (lastBetAmount) {
      setBetAmount(lastBetAmount);
    }
  }, [lastBetAmount, setBetAmount]);

  // Store last bet details when placing a bet
  const handlePlaceBetWithTracking = useCallback(() => {
    // Store the current bet details before placing the bet
    // This ensures we capture the values even if they change during processing
    setLastBetDetails({
      // Use existing result if available
      result: gameState.lastResult,
      // Store current chosen number and bet amount
      chosenNumber,
      betAmount,
    });

    // Call the original bet handler
    handlePlaceBet();
  }, [handlePlaceBet, chosenNumber, betAmount, gameState.lastResult]);

  // Add state for dropdown sections
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gaming-primary to-gaming-primary-light mb-4">
            GAMA FLIP
          </h1>
          <p className="text-secondary-700 text-lg max-w-2xl mx-auto">
            Choose Heads or Tails, place your bet, and test your luck! Win up to
            2x your bet amount.
          </p>
        </div>

        {/* Show welcome banner only for users who haven't connected their wallet */}
        {(!isWalletConnected || !account) && (
          <WelcomeBanner onConnectClick={connectWallet} />
        )}

        {balanceLoading && (
          <div className="bg-white p-4 rounded-lg border border-secondary-200 shadow-sm">
            <div className="flex items-center justify-center space-x-2">
              <LoadingSpinner size="small" />
              <span className="text-secondary-700">Updating balance...</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main betting column */}
          <div className="lg:col-span-7 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white backdrop-blur-md rounded-xl border border-secondary-200 p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-secondary-800">
                  Place Your Bet
                </h2>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-sm text-green-600">Live Game</span>
                </div>
              </div>

              <div className="mb-4">
                <NumberSelector
                  value={getCurrentSelectedSide()}
                  onChange={handleCoinSideSelected}
                  disabled={gameState.isProcessing}
                />
              </div>

              <div className="mb-8">
                <div className="space-y-4">
                  <BetInput
                    value={betAmount}
                    onChange={setBetAmount}
                    disabled={gameState.isProcessing || hasNoTokens}
                    lastBetAmount={lastBetAmount}
                    onRepeatLastBet={handleRepeatLastBet}
                    userBalance={balanceData?.balance || BigInt(0)}
                  >
                    <BalancePanel
                      userBalance={balanceData?.balance || BigInt(0)}
                      allowance={balanceData?.allowance || BigInt(0)}
                      betAmount={betAmount}
                      isLoading={balanceLoading}
                    />
                  </BetInput>
                </div>
                {hasNoTokens && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-red-500 mr-2"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="text-red-700 text-sm">
                        You don&apos;t have any tokens to play. Please acquire
                        tokens first.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                {/* Add ApprovalGuide when approval is needed and wallet is connected */}
                {isWalletConnected &&
                  account &&
                  needsApproval &&
                  !hasNoTokens &&
                  !isBetting &&
                  !isApproving && (
                    <ApprovalGuide
                      onApproveClick={handleApproveToken}
                      isApproving={isApproving}
                    />
                  )}

                {/* Keep existing approval button but wrapped in a div that's hidden on mobile */}
                <div
                  className={`${needsApproval && !hasNoTokens && !isBetting && !isApproving ? '' : 'hidden'}`}
                >
                  <button
                    disabled={isApproving}
                    onClick={handleApproveToken}
                    className={`w-full py-3 rounded-lg font-medium transition-all ${
                      isApproving
                        ? 'bg-purple-200/70 text-purple-700 cursor-not-allowed'
                        : 'bg-purple-500/80 hover:bg-purple-600 text-white backdrop-blur-sm'
                    }`}
                  >
                    {isApproving ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-purple-700/30 border-t-purple-700 rounded-full animate-spin"></div>
                        Approving tokens...
                      </div>
                    ) : (
                      'Approve tokens for betting'
                    )}
                  </button>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePlaceBetWithTracking}
                  disabled={
                    (gameState.isProcessing && !gameState.lastResult) ||
                    (gameState.isRolling &&
                      gameStatus?.isActive &&
                      !gameStatus?.isCompleted) ||
                    isApproving ||
                    isBetting ||
                    !chosenNumber ||
                    needsApproval ||
                    hasNoTokens
                  }
                  className="h-14 w-full bg-gradient-to-r from-gaming-primary to-gaming-accent hover:from-gaming-primary/90 hover:to-gaming-accent/90 font-medium rounded-lg transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {(gameState.isProcessing && !gameState.lastResult) ||
                  (gameState.isRolling &&
                    gameStatus?.isActive &&
                    !gameStatus?.isCompleted) ? (
                    <span className="flex items-center justify-center">
                      <LoadingSpinner size="small" />
                      <span className="ml-2">
                        {gameState.isRolling &&
                        gameStatus?.isActive &&
                        !gameStatus?.isCompleted
                          ? 'Rolling Coin...'
                          : gameState.isProcessing && gameState.lastResult
                            ? 'Finalizing bet...'
                            : isBetting
                              ? 'Confirming transaction...'
                              : 'Processing your bet...'}
                      </span>
                    </span>
                  ) : hasNoTokens ? (
                    'Not enough tokens for betting'
                  ) : needsApproval ? (
                    'Approve tokens first'
                  ) : !chosenNumber ? (
                    'Choose a coin to bet on'
                  ) : (
                    <span className="flex items-center justify-center">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        ></path>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                      Flip Coin
                    </span>
                  )}
                </motion.button>

                {/* Processing Status Message */}
                {(gameState.isProcessing ||
                  gameState.isRolling ||
                  isBetting) && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-center shadow-sm"
                  >
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="font-medium text-gray-800">
                        {gameState.isRolling &&
                        gameStatus?.isActive &&
                        !gameStatus?.isCompleted
                          ? 'Waiting for Random Number'
                          : gameState.isProcessing && gameState.lastResult
                            ? 'Finalizing Bet Result'
                            : isBetting
                              ? 'Confirming Transaction'
                              : 'Processing Bet'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {gameState.isRolling &&
                      gameStatus?.isActive &&
                      !gameStatus?.isCompleted
                        ? 'Please wait while we get a secure random result from VRF...'
                        : gameState.isProcessing && gameState.lastResult
                          ? 'Your bet has been placed. Waiting for final confirmation...'
                          : isBetting
                            ? 'Please confirm the transaction in your wallet...'
                            : 'Your bet is being processed. Please wait...'}
                    </p>
                  </motion.div>
                )}

                {/* VRF Recovery Button */}
                {showVrfButton && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsVrfModalOpen(true)}
                    className="h-14 mt-4 w-full bg-gradient-to-r from-purple-600/80 to-purple-700/80 hover:from-purple-700/90 hover:to-purple-800/90 text-white font-medium rounded-lg transition-all shadow-lg flex items-center justify-center backdrop-blur-sm"
                  >
                    <FontAwesomeIcon icon={faRandom} className="mr-2" />
                    {gameStatus?.recoveryEligible
                      ? 'Recover your bet'
                      : 'Check roll status'}
                  </motion.button>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-5 space-y-6">
            {/* CoinFlip Visualizer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white backdrop-blur-3xl rounded-xl border border-secondary-200 p-6 shadow-xl"
            >
              <div className="flex flex-col items-center justify-center">
                <div className="w-full flex items-center justify-center">
                  <CoinFlipVisualizer
                    isRolling={gameState.isRolling}
                    result={gameState.lastResult}
                    chosenNumber={chosenNumber}
                  />
                </div>
              </div>
            </motion.div>

            {/* Latest Bet - Separate Component */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white backdrop-blur-3xl rounded-xl border border-secondary-200 shadow-xl"
            >
              <LatestBet
                betResult={lastBetDetails?.result || gameState.lastResult}
                chosenNumber={lastBetDetails?.chosenNumber || chosenNumber}
                betAmount={lastBetDetails?.betAmount || betAmount}
              />
            </motion.div>
          </div>
        </div>

        {/* Game History & Stats - with dropdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-white backdrop-blur-md rounded-xl border border-secondary-200 shadow-xl overflow-hidden"
          data-section="game-history"
        >
          <div
            className="p-6 flex justify-between items-center cursor-pointer relative z-10 hover:bg-gray-50/50 transition-colors duration-200"
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            role="button"
            aria-expanded={isHistoryOpen}
            tabIndex={0}
            onKeyPress={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                setIsHistoryOpen(!isHistoryOpen);
              }
            }}
          >
            <h2 className="text-2xl font-bold text-secondary-800">
              Game History
            </h2>
            <motion.div
              animate={{ rotate: isHistoryOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 hover:text-gray-700"
            >
              <FontAwesomeIcon icon={faChevronDown} />
            </motion.div>

            {/* Invisible overlay to increase clickable area */}
            <div
              className="absolute inset-0 z-0"
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            ></div>
          </div>

          <AnimatePresence>
            {isHistoryOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden relative z-0"
              >
                <div className="px-6 pb-6">
                  <GameHistory
                    account={account}
                    CoinFlipContract={contracts?.CoinFlip}
                    onError={onError}
                    hideHeading={true}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Game rules and odds - Enhanced & Modernized with dropdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="bg-white/90 backdrop-blur-md rounded-xl border border-[#22AD74]/20 shadow-xl relative overflow-hidden"
        >
          {/* Decorative elements */}
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#22AD74]/10 rounded-full opacity-30 blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-20 -left-20 w-52 h-52 bg-[#22AD74]/10 rounded-full opacity-30 blur-3xl pointer-events-none"></div>

          <div
            className="p-8 flex justify-between items-center cursor-pointer relative z-10 hover:bg-[#22AD74]/5 transition-colors duration-200"
            onClick={() => setIsRulesOpen(!isRulesOpen)}
            role="button"
            aria-expanded={isRulesOpen}
            tabIndex={0}
            onKeyPress={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                setIsRulesOpen(!isRulesOpen);
              }
            }}
          >
            <h2 className="text-2xl font-bold text-[#22AD74] bg-clip-text text-transparent bg-gradient-to-r from-[#22AD74] to-[#22AD74]/70">
              Game Rules & Odds
            </h2>
            <motion.div
              animate={{ rotate: isRulesOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="w-10 h-10 bg-[#22AD74]/10 rounded-full flex items-center justify-center text-[#22AD74] hover:bg-[#22AD74]/20"
            >
              <FontAwesomeIcon icon={faChevronDown} className="text-lg" />
            </motion.div>

            {/* Invisible overlay to increase clickable area */}
            <div
              className="absolute inset-0 z-0"
              onClick={() => setIsRulesOpen(!isRulesOpen)}
            ></div>
          </div>

          <AnimatePresence>
            {isRulesOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden relative z-0"
              >
                <div className="px-8 pb-8">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* How to Play */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="bg-white/60 backdrop-blur-sm rounded-xl border border-[#22AD74]/10 p-6 shadow-sm transition-all hover:shadow-md hover:border-[#22AD74]/30"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#22AD74]/10 flex items-center justify-center mb-4">
                        <FontAwesomeIcon
                          icon={faCoins}
                          className="text-[#22AD74] text-xl"
                        />
                      </div>
                      <h3 className="text-xl font-semibold mb-4 text-[#22AD74]">
                        How to Play
                      </h3>
                      <ul className="space-y-3.5 text-gray-700">
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-[#22AD74]/20 flex flex-shrink-0 items-center justify-center text-xs text-[#22AD74] font-bold mt-0.5">
                            1
                          </div>
                          <span>Choose either Heads or Tails</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-[#22AD74]/20 flex flex-shrink-0 items-center justify-center text-xs text-[#22AD74] font-bold mt-0.5">
                            2
                          </div>
                          <span>Enter your bet amount in GAMA tokens</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-[#22AD74]/20 flex flex-shrink-0 items-center justify-center text-xs text-[#22AD74] font-bold mt-0.5">
                            3
                          </div>
                          <span>
                            Click &quot;Flip Coin&quot; to place your bet
                          </span>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-[#22AD74]/20 flex flex-shrink-0 items-center justify-center text-xs text-[#22AD74] font-bold mt-0.5">
                            4
                          </div>
                          <span>Wait for the blockchain verification</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-[#22AD74]/20 flex flex-shrink-0 items-center justify-center text-xs text-[#22AD74] font-bold mt-0.5">
                            5
                          </div>
                          <span>
                            If the Coin Flip matches your choice, you win
                            instantly!
                          </span>
                        </li>
                      </ul>
                    </motion.div>

                    {/* Odds & Payouts */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-white/60 backdrop-blur-sm rounded-xl border border-[#22AD74]/10 p-6 shadow-sm transition-all hover:shadow-md hover:border-[#22AD74]/30"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#22AD74]/10 flex items-center justify-center mb-4">
                        <FontAwesomeIcon
                          icon={faChartLine}
                          className="text-[#22AD74] text-xl"
                        />
                      </div>
                      <h3 className="text-xl font-semibold mb-4 text-[#22AD74]">
                        Odds & Payouts
                      </h3>
                      <div className="space-y-3 text-gray-700">
                        <table className="w-full">
                          <tbody>
                            <tr className="border-b border-gray-100">
                              <td className="py-2.5">Win Probability:</td>
                              <td className="py-2.5 text-right font-semibold">
                                50% (1/2)
                              </td>
                            </tr>
                            <tr className="border-b border-gray-100">
                              <td className="py-2.5">Payout Multiplier:</td>
                              <td className="py-2.5 text-right font-semibold text-[#22AD74]">
                                2x
                              </td>
                            </tr>
                            <tr className="border-b border-gray-100">
                              <td className="py-2.5">House Edge:</td>
                              <td className="py-2.5 text-right font-semibold">
                                0%
                              </td>
                            </tr>
                            <tr className="border-b border-gray-100">
                              <td className="py-2.5">Coin Flip Outcome:</td>
                              <td className="py-2.5 text-right font-semibold">
                                Heads or Tails
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <div className="pt-3 mt-1">
                          <p className="text-sm text-gray-600">
                            For each coin flip, you choose either Heads or
                            Tails. When you win (the flip matches your chosen
                            side), you receive 2x your bet amount, giving the
                            game a true 0% house edge with fair odds.
                          </p>
                          <p className="text-xs text-[#22AD74] italic mt-2">
                            Note: Blockchain transaction fees apply to all bets
                          </p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Blockchain Verification */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-white/60 backdrop-blur-sm rounded-xl border border-[#22AD74]/10 p-6 shadow-sm transition-all hover:shadow-md hover:border-[#22AD74]/30"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#22AD74]/10 flex items-center justify-center mb-4">
                        <FontAwesomeIcon
                          icon={faRandom}
                          className="text-[#22AD74] text-xl"
                        />
                      </div>
                      <h3 className="text-xl font-semibold mb-4 text-[#22AD74]">
                        Verifiable Fairness
                      </h3>
                      <div className="space-y-3.5 text-gray-700">
                        <p>
                          GAMA FLIP uses{' '}
                          <span className="font-medium">
                            Plugin&apos;s Verifiable Random Function (VRF)
                          </span>{' '}
                          to ensure complete fairness and transparency.
                        </p>
                        <div className="bg-[#22AD74]/5 rounded-lg p-4 text-sm">
                          <p className="font-medium mb-2">How VRF works:</p>
                          <ol className="list-decimal list-inside space-y-2 text-gray-600">
                            <li>
                              When you place a bet, GAMA tokens are burned from
                              your wallet
                            </li>
                            <li>
                              Your bet generates a secure random number request
                              via Plugin VRF
                            </li>
                            <li>
                              The VRF oracle provides cryptographically secure
                              randomness
                            </li>
                            <li>
                              The coin flip result (Heads or Tails) is
                              determined transparently on-chain
                            </li>
                            <li>
                              If you win, your payout is minted directly to your
                              wallet
                            </li>
                          </ol>
                        </div>
                        <p className="text-sm">
                          In rare cases where VRF confirmation takes longer than
                          usual, a recovery option becomes available after the
                          required conditions are met. This allows you to
                          recover your original bet amount safely.
                        </p>
                      </div>
                    </motion.div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-8 p-5 bg-[#22AD74]/5 rounded-xl border border-[#22AD74]/10"
                  >
                    <h4 className="font-semibold text-[#22AD74] mb-4 flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Important Game Information
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column */}
                      <div className="space-y-4">
                        <div className="bg-white/40 rounded-lg p-4 shadow-sm">
                          <h5 className="font-medium text-[#22AD74] mb-2 text-sm">
                            Betting Limits
                          </h5>
                          <table className="w-full text-sm">
                            <tbody>
                              <tr className="border-b border-gray-100">
                                <td className="py-1.5 text-gray-700">
                                  Minimum Bet:
                                </td>
                                <td className="py-1.5 text-right font-medium text-gray-800">
                                  1 GAMA
                                </td>
                              </tr>
                              <tr className="border-b border-gray-100">
                                <td className="py-1.5 text-gray-700">
                                  Maximum Bet:
                                </td>
                                <td className="py-1.5 text-right font-medium text-gray-800">
                                  10,000,000 GAMA
                                </td>
                              </tr>
                              <tr>
                                <td className="py-1.5 text-gray-700">
                                  Maximum Win:
                                </td>
                                <td className="py-1.5 text-right font-medium text-gray-800">
                                  20,000,000 GAMA
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-4">
                        <div className="bg-white/40 rounded-lg p-4 shadow-sm h-full">
                          <h5 className="font-medium text-[#22AD74] mb-2 text-sm">
                            Recovery System
                          </h5>
                          <p className="text-sm text-gray-700 mb-2">
                            Bets become eligible for refund when both conditions
                            are met:
                          </p>
                          <ul className="list-disc ml-5 space-y-1.5 text-sm text-gray-700">
                            <li>
                              At least 1 hour has passed since placing bet
                            </li>
                            <li>At least 300 blocks have been mined</li>
                          </ul>
                          <p className="text-xs text-gray-500 mt-3 italic">
                            Recovery can be initiated from the game interface
                            when eligible
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* VRF Recovery Modal */}
      <VrfRecoveryModal
        isOpen={isVrfModalOpen}
        onClose={() => setIsVrfModalOpen(false)}
      />
    </div>
  );
};

export default CoinFlipPage;
