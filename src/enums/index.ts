// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

export enum SubscriptionType {
  UNLIMITED = 0,
  TIME_BASED = 1,
}

export enum DurationType {
  UNLIMITED = 0,
  MONTHLY = 1,
  QUARTERLY = 2,
  SEMI_ANNUAL = 3,
  ANNUAL = 4,
}

export enum Duration {
  UNLIMITED = 0,
  MONTH = 2592000,
  QUARTER = 7776000,
  SEMI_ANNUAL = 15552000,
  ANNUAL = 31536000,
}

export enum PriceNormalizationType {
  RAW = 0,
  PRETTY = 1,
}

export enum DiscountType {
  PERCENTAGE = 0,
  FIXED = 1,
}

export enum ChainType {
  TESTNET = "testnet",
  MAINNET = "mainnet",
}

export enum LockerType {
  CREATOR = 0,
  USER = 1,
}

export enum LifecycleState {
  ENABLED = 0,
  DISABLED = 1,
}
