// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";
import {
  ChainType,
  DiscountType,
  Duration,
  LifecycleState,
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
  createdAt: bigint;
  expiresAt: bigint | null;
  duration: Duration;
  subID: bigint;
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
  discountValue: bigint;
}

/**
 * Interface for the discount record.
 */
export interface DiscountRecord extends BaseDiscountRecord {
  createdAt: bigint;
  expiresAt: bigint | null;
  totalClaims: bigint;
}
// === Common ===

/**
 * Interface for the asset metadata.
 */
export interface AssetMetadata {
  index: bigint;
  creator: Address;
  name: string;
  decimals: number;
  unitName: string;
}

/**
 * Interface for the discount metadata.
 */
export interface DiscountMetadata extends BaseDiscountRecord {
  expiresIn?: bigint;
}

/**
 * Interface for the product global state.
 */
interface ProductGlobalState {
  productName: string;
  subscriptionName: string;
  manager: Address;
  price: bigint;
  totalSubs: bigint;
  maxSubs: bigint;
  coinID: bigint;
  productType: ProductType;
  duration: Duration;
  lifecycle: LifecycleState;
  createdAt: bigint;
  oracleID: bigint;
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
  registryID?: bigint;
}

export interface RegistryCreateLockerParams {
  creator: TransactionSignerAccount;
  lockerType: LockerType;
}

export interface RegistryCreateProductParams {
  productName: string;
  productType: ProductType;
  subscriptionName: string;
  price: bigint;
  lockerID: bigint;
  maxSubs?: bigint;
  coinID?: bigint;
  duration?: Duration;
  unitName?: string;
  imageUrl?: string;
  parseWholeUnits?: boolean;
}

export interface RegistryDeleteProductParams {
  productID: bigint;
  lockerID: bigint;
}
