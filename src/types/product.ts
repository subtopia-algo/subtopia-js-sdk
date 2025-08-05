import { DiscountRecord } from "types";
import {
  ProductType,
  Duration,
  DiscountType,
  LifecycleState,
  ChainType,
} from "./enums";
import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";
import algosdk, { Address } from "algosdk";

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

export interface ProductLifecycleStateUpdate {
  lifecycle: LifecycleState;
}

export interface ProductDiscountCreationParams {
  discountType: DiscountType;
  discountValue: bigint;
  expiresIn: bigint;
  parseWholeUnits?: boolean;
}

export interface ProductSubscriptionCreationParams {
  subscriber: TransactionSignerAccount;
}

export interface ProductSubscriptionTransferParams {
  oldSubscriber: TransactionSignerAccount;
  newSubscriberAddress: Address;
  subscriptionID: bigint;
}

export interface ProductSubscriptionClaimParams {
  subscriber: TransactionSignerAccount;
  subscriptionID: bigint;
}

export interface ProductSubscriptionDeletionParams {
  subscriber: TransactionSignerAccount;
  subscriptionID: bigint;
}

export interface ProductSubscriberCheckParams {
  subscriberAddress: Address;
}

export interface ProductSubscriptionRetrievalParams {
  algodClient: algosdk.Algodv2;
  subscriberAddress: Address;
}

export interface ProductInitParams {
  algodClient: algosdk.Algodv2;
  chainType: ChainType;
  productID: bigint;
  creator: TransactionSignerAccount;
  registryID?: bigint;
  timeout?: number;
}
