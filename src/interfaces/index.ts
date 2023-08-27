// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

import { Algodv2, LogicSigAccount, TransactionSigner } from "algosdk";
import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";
import {
  DiscountType,
  SMILifecycle,
  SubscriptionExpirationType,
  SubscriptionType,
} from "../enums";
import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";

// === Boxes ===

export interface RawDiscount {
  duration: bigint;
  discount_type: bigint;
  discount_value: bigint;
  expires_at: bigint;
  created_at: bigint;
  total_claims: bigint;
}

export interface ApplicationSpec {
  approval: Uint8Array;
  clear: Uint8Array;
  globalNumUint: number;
  globalNumByteSlice: number;
  localNumUint: number;
  localNumByteSlice: number;
}

export interface SubscriptionRecord {
  createdAt: Date;
  expiresAt: Date | undefined;
  expirationType: SubscriptionExpirationType;
  subID: number;
  subType: SubscriptionType;
}

export interface BaseDiscountRecord {
  expirationType: SubscriptionExpirationType;
  discountType: DiscountType;
  discountValue: number;
}

export interface DiscountRecord extends BaseDiscountRecord {
  createdAt: Date;
  expiresAt: Date | undefined;
  totalClaims: number;
}

export interface PendingTransferRecord {
  locker: string;
  smiID: number;
}

// === Common ===

export interface Locker {
  lsig: LogicSigAccount;
  signer: TransactionSigner;
  authAddress: string;
}

export interface LockerRekeyParameters {
  client: AlgodClient;
  locker: LogicSigAccount;
  creatorAddress: string;
  creatorSigner: TransactionSigner;
  registryAddress: string;
  registrySigner: TransactionSigner;
  rekeyToAddress: string;
}

export interface AssetMetadata {
  index: number;
  creator: string;
  name: string;
  decimals: number;
  unitName: string;
}

export interface User {
  address: string;
  signer: TransactionSigner;
}

export interface ChainMethodParams {
  client: Algodv2;
  sender?: string;
  signer?: TransactionSigner;
}

export interface SMIInputParams {
  name: string;
  price: number;
  subType: SubscriptionType;
  maxSubs: number;
  coinID: number;
}

export interface DiscountMetadata extends BaseDiscountRecord {
  expiresIn?: number;
}

export interface SMICreateDiscountParams {
  smiID: number;
  creator: User;
  discount: DiscountMetadata;
  smrID?: number;
}

export interface SMIDeleteDiscountParams {
  smiID: number;
  creator: User;
  expirationType: SubscriptionExpirationType;
  smrID?: number;
}

// === SMR ===

export interface SMRAddInfrastructureParams extends SMIInputParams {
  creator: TransactionSignerAccount;
  client: AlgodClient;
  smrID?: number;
  unitName?: string;
  imageUrl?: string;
}

export interface SMRGetRegistryParams {
  client: AlgodClient;
  user: User;
  smrID?: number;
}

export interface SMRClaimInfrastructureParams {
  creator: User;
  smrID?: number;
  smiID: number;
  client: AlgodClient;
}

export interface SMRTransferInfrastructureParams
  extends SMRClaimInfrastructureParams {
  newCreatorAddress: string;
}

// === SMI  ===

export interface SMIState extends SMIInputParams {
  smiID: number;
  manager: string;
  activeSubs: number;
  totalSubs: number;
  lifecycle: SMILifecycle;
  discounts: DiscountRecord[];
  createdAt: Date;
  isPendingTransfer?: boolean;
}

export interface SMIUnsubscribeParams {
  subscriber: User;
  smiID: number;
}

export interface SMIClaimSubscriptionParams {
  smiID: number;
  subID: number;
  subscriber: User;
}

export interface SMITransferSubscriptionParams {
  newOwnerAddress: string;
  oldOwner: User;
  subID: number;
  smiID: number;
}

export interface SMISubscribeParams {
  smrID?: number;
  smiID: number;
  expirationType?: SubscriptionExpirationType;
  subscriber: User;
}

export interface SMIMarkForDeletionParams {
  smiID: number;
  smrID?: number;
  user: User;
}

export interface SMIDeleteSubscriptionParams {
  smiID: number;
  smrID?: number;
  user: User;
}

export interface SMIClaimRevenueParams {
  coinID?: number;
  smrID?: number;
  user: User;
}
