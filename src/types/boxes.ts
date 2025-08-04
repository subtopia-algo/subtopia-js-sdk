// === Boxes ===

import { Address } from "algosdk";
import { Duration, ProductType, DiscountType } from "./enums";

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
  subscriptionID: bigint;
  productType: ProductType;
}

/**
 * Interface for the subscriber record.
 */
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

/**
 * Interface for the discount metadata.
 */
export interface DiscountMetadata extends BaseDiscountRecord {
  expiresIn?: bigint;
}
