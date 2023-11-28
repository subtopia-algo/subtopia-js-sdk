// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

/**
 * Enum for subscription types.
 * @enum {number}
 */
export enum SubscriptionType {
  UNLIMITED = 0,
  TIME_BASED = 1,
}

/**
 * Enum for duration types.
 * @enum {number}
 */
export enum Duration {
  UNLIMITED = 0,
  MONTH = 2592000,
  QUARTER = 7776000,
  SEMI_ANNUAL = 15552000,
  ANNUAL = 31536000,
}

/**
 * Enum for price normalization types.
 * @enum {number}
 */
export enum PriceNormalizationType {
  RAW = 0,
  PRETTY = 1,
}

/**
 * Enum for discount types.
 * @enum {number}
 */
export enum DiscountType {
  PERCENTAGE = 0,
  FIXED = 1,
}

/**
 * Enum for blockchain types.
 * @enum {string}
 */
export enum ChainType {
  LOCALNET = "localnet",
  TESTNET = "testnet",
  MAINNET = "mainnet",
}

/**
 * Enum for locker types.
 * @enum {number}
 */
export enum LockerType {
  CREATOR = 0,
  USER = 1,
}

/**
 * Enum for lifecycle states.
 * @enum {number}
 */
export enum LifecycleState {
  ENABLED = 0,
  DISABLED = 1,
}
