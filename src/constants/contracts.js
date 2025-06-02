import { DEFAULT_NETWORK } from '../config';

/**
 * Contract addresses for different networks
 * These addresses should be updated when deploying to different networks
 */

// XDC Testnet (Apothem)
export const Roulette_CONTRACT_ADDRESS_APOTHEM = import.meta.env
  .VITE_APOTHEM_Roulette_ADDRESS;
export const TOKEN_CONTRACT_ADDRESS_APOTHEM = import.meta.env
  .VITE_APOTHEM_TOKEN_ADDRESS;

// XDC Mainnet
export const Roulette_CONTRACT_ADDRESS_MAINNET = import.meta.env
  .VITE_Roulette_ADDRESS;
export const TOKEN_CONTRACT_ADDRESS_MAINNET = import.meta.env
  .VITE_TOKEN_ADDRESS;

// Local development (fallback to Apothem address if not specified)
export const Roulette_CONTRACT_ADDRESS_LOCAL =
  import.meta.env.VITE_LOCAL_Roulette_ADDRESS ||
  Roulette_CONTRACT_ADDRESS_APOTHEM;
export const TOKEN_CONTRACT_ADDRESS_LOCAL =
  import.meta.env.VITE_LOCAL_TOKEN_ADDRESS || TOKEN_CONTRACT_ADDRESS_APOTHEM;

// Default addresses based on environment
export const Roulette_CONTRACT_ADDRESS =
  DEFAULT_NETWORK === 'mainnet'
    ? Roulette_CONTRACT_ADDRESS_MAINNET
    : Roulette_CONTRACT_ADDRESS_APOTHEM;

export const TOKEN_CONTRACT_ADDRESS =
  DEFAULT_NETWORK === 'mainnet'
    ? TOKEN_CONTRACT_ADDRESS_MAINNET
    : TOKEN_CONTRACT_ADDRESS_APOTHEM;
