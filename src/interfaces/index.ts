// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

import { DiscountType, Duration, ProductType } from "../enums";

// === Boxes ===

/**
 * Interface for the application specification.
 */
export interface ApplicationSpec {
  approval: Uint8Array;
  clear: Uint8Array;
  globalNumUint: number;
  globalNumByteSlice: number;
  localNumUint: number;
  localNumByteSlice: number;
}

/**
 * Interface for the subscription record.
 */
export interface SubscriptionRecord {
  createdAt: number;
  expiresAt: number | null;
  duration: Duration;
  subID: number;
  subType: ProductType;
}

export interface SubscriberRecord {
  address: string;
  subscription: SubscriptionRecord;
}

/**
 * Interface for the base discount record.
 */
export interface BaseDiscountRecord {
  discountType: DiscountType;
  discountValue: number;
}

/**
 * Interface for the discount record.
 */
export interface DiscountRecord extends BaseDiscountRecord {
  createdAt: number;
  expiresAt: number | null;
  totalClaims: number;
}
// === Common ===

/**
 * Interface for the asset metadata.
 */
export interface AssetMetadata {
  index: number;
  creator: string;
  name: string;
  decimals: number;
  unitName: string;
}

/**
 * Interface for the discount metadata.
 */
export interface DiscountMetadata extends BaseDiscountRecord {
  expiresIn?: number;
}

/**
 * Interface for the product global state.
 */
interface ProductGlobalState {
  productName: string;
  subscriptionName: string;
  manager: string;
  price: number;
  totalSubs: number;
  maxSubs: number;
  coinID: number;
  productType: ProductType;
  duration: Duration;
  lifecycle: number;
  createdAt: number;
  oracleID: number;
  unitName: string;
  imageURL: string;
}

/**
 * Interface for the product state.
 */
export interface ProductState extends ProductGlobalState {
  discount?: DiscountRecord;
}
