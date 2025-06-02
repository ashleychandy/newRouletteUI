import { useEffect, useState } from 'react';
import { useWallet } from '../components/wallet/WalletProvider';
import { ethers } from 'ethers';
import { useNetwork } from '../contexts/NetworkContext';
import CoinFlipABI from '../contracts/abi/CoinFlip.json';
import TokenABI from '../contracts/abi/GamaToken.json';

export const useCoinFlipContract = () => {
  const { provider, account } = useWallet();
  const { currentNetwork } = useNetwork();
  const [contract, setContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initContracts = async () => {
      try {
        if (!provider || !account || !currentNetwork) {
          setContract(null);
          setTokenContract(null);
          setError(null);
          setIsLoading(false);
          return;
        }

        // Handle both address structures
        const CoinFlipAddress =
          currentNetwork.contracts?.CoinFlip || currentNetwork.CoinFlipAddress;
        const tokenAddress =
          currentNetwork.contracts?.token || currentNetwork.tokenAddress;

        if (!CoinFlipAddress) {
          setError(
            new Error(
              `CoinFlip contract address not configured for network: ${currentNetwork.name}`
            )
          );
          setContract(null);
          setIsLoading(false);
          return;
        }

        if (!TokenABI?.abi) {
          setError(new Error('Token ABI not available'));
          setIsLoading(false);
          return;
        }

        const signer = provider.getSigner
          ? await provider.getSigner()
          : provider;

        // Initialize CoinFlip contract
        try {
          const CoinFlipContract = new ethers.Contract(
            CoinFlipAddress,
            CoinFlipABI.abi,
            signer
          );
          setContract(CoinFlipContract);
        } catch (CoinFlipError) {
          setError(
            new Error(
              `CoinFlip contract initialization failed: ${CoinFlipError.message}`
            )
          );
          setContract(null);
        }

        // Initialize token contract if address is available
        if (tokenAddress) {
          try {
            const token = new ethers.Contract(
              tokenAddress,
              TokenABI.abi,
              signer
            );
            setTokenContract(token);
          } catch (tokenError) {
            setTokenContract(null);
          }
        }
      } catch (err) {
        setError(err);
        setContract(null);
        setTokenContract(null);
      } finally {
        setIsLoading(false);
      }
    };

    initContracts();
  }, [provider, account, currentNetwork]);

  return {
    contract,
    tokenContract,
    isLoading,
    error,
  };
};
