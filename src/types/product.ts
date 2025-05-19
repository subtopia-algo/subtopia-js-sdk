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

export interface ProductLifecycleStateUpdate {
  lifecycle: LifecycleState;
}

export interface ProductDiscountCreationParams {
  discountType: DiscountType;
  discountValue: number;
  expiresIn: number;
  parseWholeUnits?: boolean;
}

export interface ProductSubscriptionCreationParams {
  subscriber: TransactionSignerAccount;
}

export interface ProductSubscriptionTransferParams {
  oldSubscriber: TransactionSignerAccount;
  newSubscriberAddress: Address;
  subscriptionID: number;
}

export interface ProductSubscriptionClaimParams {
  subscriber: TransactionSignerAccount;
  subscriptionID: number;
}

export interface ProductSubscriptionDeletionParams {
  subscriber: TransactionSignerAccount;
  subscriptionID: number;
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
  productID: number;
  creator: TransactionSignerAccount;
  registryID?: number;
  timeout?: number;
}
