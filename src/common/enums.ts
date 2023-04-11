// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

export enum SubscriptionType {
  UNLIMITED = 0,
  TIME_BASED = 1,
}

export enum SubscriptionExpirationType {
  UNLIMITED = 0,
  MONTHLY = 1,
  QUARTERLY = 2,
  SEMI_ANNUAL = 3,
  ANNUAL = 4,
}

export enum PriceNormalizationType {
  RAW = 0,
  PRETTY = 1,
}

export enum SMILifecycle {
  ACTIVE = 0,
  DELETING = 1,
}

export enum DiscountType {
  PERCENTAGE = 0,
  FIXED = 1,
}
