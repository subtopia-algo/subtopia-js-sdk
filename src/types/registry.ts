import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";
import { ChainType, LockerType, Duration, ProductType } from "./enums";
import algosdk, { Address } from "algosdk";
/**
 * Parameters required for initializing the registry.
 */
export interface RegistryInitParams {
  /** Algod client instance */
  algodClient: algosdk.Algodv2;
  /** Account of the creator */
  creator: TransactionSignerAccount;
  /** Type of the blockchain network */
  chainType: ChainType;
  /** Optional timeout duration */
  timeout?: number;
  /** Optional registry ID */
  registryID?: bigint;
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
  price: bigint;
  /** ID of the locker */
  lockerID: bigint;
  /** Optional maximum number of subscriptions */
  maxSubs?: bigint;
  /** Optional coin ID */
  coinID?: bigint;
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
  productID: bigint;
  /** ID of the locker */
  lockerID: bigint;
}

/**
 * Parameters required for transferring a product.
 */
export interface RegistryTransferProductParams {
  /** ID of the product */
  productID: bigint;
  /** Address of the new owner */
  newOwnerAddress: Address;
}

/**
 * Parameters required for getting a locker.
 */
export interface RegistryGetLockerParams {
  /** ID of the registry */
  registryID: bigint;
  /** Algod client instance */
  algodClient: algosdk.Algodv2;
  /** Address of the owner */
  ownerAddress: Address;
  /** Type of the locker */
  lockerType: LockerType;
}
