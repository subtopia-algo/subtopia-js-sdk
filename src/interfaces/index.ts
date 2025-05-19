// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";
import {
  ChainType,
  DiscountType,
  Duration,
  LockerType,
  ProductType,
} from "../types/enums";
import algosdk, { Address } from "algosdk";

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
  address: Address;
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
  creator: Address;
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
  manager: Address;
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

/**
 * Interfaces for the registry client
 */

export interface RegistryInitParams {
  algodClient: algosdk.Algodv2;
  creator: TransactionSignerAccount;
  chainType: ChainType;
  timeout?: number;
  registryID?: number;
}

export interface RegistryCreateLockerParams {
  creator: TransactionSignerAccount;
  lockerType: LockerType;
}

export interface RegistryCreateProductParams {
  productName: string;
  productType: ProductType;
  subscriptionName: string;
  price: number;
  lockerID: number;
  maxSubs?: number;
  coinID?: number;
  duration?: Duration;
  unitName?: string;
  imageUrl?: string;
  parseWholeUnits?: boolean;
}

export interface RegistryDeleteProductParams {
  productID: number;
  lockerID: number;
}
