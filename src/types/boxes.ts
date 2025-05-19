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
  createdAt: number;
  expiresAt: number | null;
  duration: Duration;
  subscriptionID: number;
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

/**
 * Interface for the discount metadata.
 */
export interface DiscountMetadata extends BaseDiscountRecord {
  expiresIn?: number;
}
