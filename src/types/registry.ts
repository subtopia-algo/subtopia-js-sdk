import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";
import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";
import { ChainType, LockerType, Duration, ProductType } from "./enums";

/**
 * Parameters required for initializing the registry.
 */
export interface RegistryInitParams {
  /** Algod client instance */
  algodClient: AlgodClient;
  /** Account of the creator */
  creator: TransactionSignerAccount;
  /** Type of the blockchain network */
  chainType: ChainType;
  /** Optional timeout duration */
  timeout?: number;
  /** Optional registry ID */
  registryID?: number;
}

/**
 * Parameters required for creating a locker.
 */
export interface RegistryCreateLockerParams {
  /** Account of the creator */
  creator: TransactionSignerAccount;
  /** Type of the locker */
  lockerType: LockerType;
}

/**
 * Parameters required for creating a product.
 */
export interface RegistryCreateProductParams {
  /** Name of the product */
  productName: string;
  /** Type of the product */
  productType: ProductType;
  /** Name of the subscription */
  subscriptionName: string;
  /** Price of the product */
  price: number;
  /** ID of the locker */
  lockerID: number;
  /** Optional maximum number of subscriptions */
  maxSubs?: number;
  /** Optional coin ID */
  coinID?: number;
  /** Optional duration of the product */
  duration?: Duration;
  /** Optional unit name */
  unitName?: string;
  /** Optional image URL */
  imageUrl?: string;
  /** Optional flag to parse whole units */
  parseWholeUnits?: boolean;
}

/**
 * Parameters required for deleting a product.
 */
export interface RegistryDeleteProductParams {
  /** ID of the product */
  productID: number;
  /** ID of the locker */
  lockerID: number;
}

/**
 * Parameters required for transferring a product.
 */
export interface RegistryTransferProductParams {
  /** ID of the product */
  productID: number;
  /** Address of the new owner */
  newOwnerAddress: string;
}

/**
 * Parameters required for getting a locker.
 */
export interface RegistryGetLockerParams {
  /** ID of the registry */
  registryID: number;
  /** Algod client instance */
  algodClient: AlgodClient;
  /** Address of the owner */
  ownerAddress: string;
  /** Type of the locker */
  lockerType: LockerType;
}
