/**
 * Core constants and enums for Subtopia SDK
 *
 * This file contains all constants, enums, and configuration values
 * used throughout the SDK, colocated within the core module for
 * better developer experience and tree-shaking.
 */

// Network constants
export const SUBTOPIA_REGISTRY_ID = (chainType: ChainType): number => {
  switch (chainType) {
    case ChainType.MAINNET:
      return 453816186;
    case ChainType.TESTNET:
      return 582962704;
    default:
      return 453816186;
  }
};

// Default values
export const SUBTOPIA_DEFAULT_IMAGE_URL =
  "https://ipfs.algonode.xyz/ipfs/bafybeiatmhfeoxvhfotpmmn2p3ufxadbfk3chhe35lp3jvdh5atfkm6qnu";
export const SUBTOPIA_DEFAULT_UNIT_NAME = "SUB";

// MBR constants (in ALGO)
export const MIN_APP_CREATE_MBR = 0.1;
export const MIN_APP_OPTIN_MBR = 0.1;
export const MIN_ASA_CREATE_MBR = 0.1;
export const MIN_ASA_OPTIN_MBR = 0.1;
export const APP_PAGE_MAX_SIZE = 2048;
export const ADDRESS_BYTE_LENGTH = 32;

// Platform fees (in cents)
export const PRODUCT_CREATION_PLATFORM_FEE_CENTS = 500;
export const SUBSCRIPTION_PLATFORM_FEE_CENTS = 10;

/**
 * Chain type enumeration
 */
export enum ChainType {
  MAINNET = "mainnet",
  TESTNET = "testnet",
  BETANET = "betanet",
  LOCALNET = "localnet",
}

/**
 * Product types supported by Subtopia
 */
export enum ProductType {
  TOKEN_BASED = 2,
}

/**
 * Locker types for managing creator assets
 */
export enum LockerType {
  CREATOR = 0,
  USER = 1,
}

/**
 * Discount types for products
 */
export enum DiscountType {
  PERCENTAGE = 0,
  FIXED = 1,
}

/**
 * Product lifecycle states
 */
export enum LifecycleState {
  ENABLED = 0,
  DISABLED = 1,
}

/**
 * Time units for duration calculations
 */
export enum TimeUnit {
  UNLIMITED = 0,
  DAY = 86400,
  MONTH = 2592000,
  QUARTER = 7776000,
  SEMI_ANNUAL = 15552000,
  ANNUAL = 31536000,
}

/**
 * Error codes for better error handling
 */
export enum ErrorCode {
  PRODUCT_NOT_FOUND = "PRODUCT_NOT_FOUND",
  PRODUCT_DISABLED = "PRODUCT_DISABLED",
  SUBSCRIPTION_NOT_FOUND = "SUBSCRIPTION_NOT_FOUND",
  SUBSCRIPTION_EXPIRED = "SUBSCRIPTION_EXPIRED",
  LOCKER_NOT_FOUND = "LOCKER_NOT_FOUND",
  INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE",
  NETWORK_ERROR = "NETWORK_ERROR",
  INVALID_PARAMETER = "INVALID_PARAMETER",
}
