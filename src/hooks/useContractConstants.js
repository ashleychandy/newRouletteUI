import { useQuery } from '@tanstack/react-query';
import { useCoinFlipContract } from './useCoinFlipContract';

export const useContractConstants = () => {
  const { contract } = useCoinFlipContract();

  const {
    data: constants,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['contractConstants'],
    queryFn: async () => {
      if (!contract) {
        throw new Error('Contract not initialized');
      }

      // Fetch all constant values in parallel
      const [
        maxBetAmount,
        maxHistorySize,
        maxPossiblePayout,
        heads,
        tails,
        resultForceStoppedValue,
        resultRecoveredValue,
      ] = await Promise.all([
        contract.MAX_BET_AMOUNT(),
        contract.MAX_HISTORY_SIZE(),
        contract.MAX_POSSIBLE_PAYOUT(),
        contract.HEADS(),
        contract.TAILS(),
        contract.RESULT_FORCE_STOPPED(),
        contract.RESULT_RECOVERED(),
      ]);

      return {
        MAX_BET_AMOUNT: maxBetAmount,
        MAX_HISTORY_SIZE: Number(maxHistorySize),
        MAX_POSSIBLE_PAYOUT: maxPossiblePayout,
        HEADS: Number(heads),
        TAILS: Number(tails),
        RESULT_FORCE_STOPPED: Number(resultForceStoppedValue),
        RESULT_RECOVERED: Number(resultRecoveredValue),
        // Derived constants
        MIN_BET_AMOUNT: BigInt(1), // 1 token in wei
        MAX_CoinFlip_NUMBER: 2, // TAILS (2)
        MIN_CoinFlip_NUMBER: 1, // HEADS (1)
        GAME_TIMEOUT: 3600, // 1 hour in seconds
        BLOCK_THRESHOLD: 300, // Number of blocks to wait before recovery
      };
    },
    enabled: !!contract,
    staleTime: Infinity, // Constants don't change
    cacheTime: Infinity, // Keep in cache indefinitely
    retry: 2,
  });

  return {
    constants: constants || {
      // Default values if contract is not available
      MAX_BET_AMOUNT: BigInt('10000000000000000000000000'), // 10,000,000 tokens
      MAX_HISTORY_SIZE: 10,
      MAX_POSSIBLE_PAYOUT: BigInt('20000000000000000000000000'), // 20,000,000 tokens
      HEADS: 1,
      TAILS: 2,
      RESULT_FORCE_STOPPED: 254,
      RESULT_RECOVERED: 255,
      MIN_BET_AMOUNT: BigInt(1),
      MAX_CoinFlip_NUMBER: 2, // TAILS (2)
      MIN_CoinFlip_NUMBER: 1, // HEADS (1)
      GAME_TIMEOUT: 3600,
      BLOCK_THRESHOLD: 300,
    },
    isLoading,
    error,
  };
};
