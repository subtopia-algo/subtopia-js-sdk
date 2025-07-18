// Core configuration types
import { AlgorandClient } from "@algorandfoundation/algokit-utils/types/algorand-client";
import { TransactionSigner } from "algosdk";
import { ChainType } from "./constants";

/**
 * Configuration for the Subtopia SDK
 */
export interface SubtopiaConfig {
  algorand: AlgorandClient;
  registryId?: bigint;
  chainType?: ChainType;
  timeout?: number;
  defaultSender?: string;
  defaultSigner?: TransactionSigner;
}

/**
 * Base result type for all operations
 */
export interface BaseResult {
  txId: string;
  confirmedRound: bigint;
}

/**
 * Product creation parameters
 */
export interface CreateProductParams {
  name: string;
  subscriptionName: string;
  price: bigint;
  coinId?: bigint;
  maxSubscriptions?: bigint;
  duration?: bigint;
  unitName?: string;
  imageUrl?: string;
}

/**
 * Product creation result
 */
export interface CreateProductResult extends BaseResult {
  productId: bigint;
}

/**
 * Subscription parameters
 */
export interface SubscribeParams {
  productId: bigint;
  subscriber: string;
}

/**
 * Subscription result
 */
export interface SubscribeResult extends BaseResult {
  subscriptionId: bigint;
}

/**
 * Product state with bigint support
 */
export interface ProductState {
  id: bigint;
  name: string;
  subscriptionName: string;
  manager: string;
  price: bigint;
  coinId: bigint;
  totalSubscribers: bigint;
  maxSubscribers: bigint;
  duration: bigint;
  lifecycle: number;
  createdAt: bigint;
  oracleId: bigint;
  unitName: string;
  imageUrl: string;
  discount?: DiscountState;
}

/**
 * Discount state
 */
export interface DiscountState {
  type: number;
  value: bigint;
  expiresAt: bigint | null;
  createdAt: bigint;
  totalClaims: bigint;
}

/**
 * Subscription state
 */
export interface SubscriptionState {
  id: bigint;
  productId: bigint;
  subscriber: string;
  createdAt: bigint;
  expiresAt: bigint | null;
  duration: bigint;
}

/**
 * Locker information
 */
export interface LockerInfo {
  id: bigint;
  owner: string;
  type: number;
}

/**
 * Registry state
 */
export interface RegistryState {
  id: bigint;
  owner: string;
  totalProducts: bigint;
  isEnabled: boolean;
  version: string;
}

/**
 * Oracle price feed
 */
export interface OraclePriceFeed {
  assetId: bigint;
  price: bigint;
  timestamp: bigint;
}
