// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

import algosdk, {
  AtomicTransactionComposer,
  makeAssetTransferTxnWithSuggestedParamsFromObject,
  Algodv2,
  ALGORAND_MIN_TX_FEE,
  SuggestedParams,
  ABIResult as SdkABIResult,
  ABIType,
  ABIArrayDynamicType,
  ABIUintType,
  decodeAddress,
  encodeAddress,
} from "algosdk";

import { ApplicationSpec, AssetMetadata } from "../types";
import {
  DEFAULT_AWAIT_ROUNDS,
  ALGO_ASSET,
  LOCKER_EXTRA_PAGES,
  LOCKER_GLOBAL_NUM_UINTS,
  LOCKER_GLOBAL_NUM_BYTE_SLICES,
  DEFAULT_TXN_SIGN_TIMEOUT_SECONDS,
} from "../constants";
import { Duration, LockerType, PriceNormalizationType } from "../types/enums";
import {
  APP_PAGE_MAX_SIZE,
  AppState,
} from "@algorandfoundation/algokit-utils/types/app";
import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";
import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";

export async function transferAsset(
  transfer: {
    sender: TransactionSignerAccount;
    recipient: string;
    assetID: number;
    amount: number;
  },
  client: Algodv2,
  timeout = DEFAULT_TXN_SIGN_TIMEOUT_SECONDS
): Promise<{
  confirmedRound: number;
  txIDs: string[];
  methodResults: algosdk.ABIResult[];
  timeout?: number;
}> {
  const { sender, recipient, assetID, amount } = transfer;
  const transferAtc = new AtomicTransactionComposer();
  transferAtc.addTransaction({
    txn: algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: sender.addr,
      to: recipient,
      closeRemainderTo: undefined,
      amount: amount,
      assetIndex: assetID,
      suggestedParams: await getParamsWithFeeCount(client, 1),
      rekeyTo: undefined,
    }),

    signer: sender.signer,
  });

  const transferResult = await asyncWithTimeout(
    transferAtc.execute.bind(transferAtc),
    timeout,
    client,
    DEFAULT_AWAIT_ROUNDS
  );

  return transferResult;
}

export async function optInAsset({
  client,
  account,
  assetID,
  timeout = DEFAULT_TXN_SIGN_TIMEOUT_SECONDS,
}: {
  client: AlgodClient | Algodv2;
  account: TransactionSignerAccount;
  assetID: number;
  timeout?: number;
}): Promise<{
  confirmedRound: number;
  txIDs: string[];
  methodResults: SdkABIResult[];
}> {
  const optInAtc = new AtomicTransactionComposer();
  optInAtc.addTransaction({
    txn: makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: account.addr,
      to: account.addr,
      amount: 0,
      suggestedParams: await getParamsWithFeeCount(client, 1),
      assetIndex: assetID,
    }),
    signer: account.signer,
  });
  const optInResult = await asyncWithTimeout(
    optInAtc.execute.bind(optInAtc),
    timeout,
    client,
    DEFAULT_AWAIT_ROUNDS
  );

  return optInResult;
}

export async function optOutAsset({
  client,
  account,
  assetID,
  timeout = DEFAULT_TXN_SIGN_TIMEOUT_SECONDS,
}: {
  client: Algodv2;
  account: TransactionSignerAccount;
  assetID: number;
  timeout?: number;
}): Promise<{
  confirmedRound: number;
  txIDs: string[];
  methodResults: SdkABIResult[];
}> {
  const optInAtc = new AtomicTransactionComposer();
  optInAtc.addTransaction({
    txn: makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: account.addr,
      to: account.addr,
      closeRemainderTo: account.addr,
      amount: 0,
      suggestedParams: await getParamsWithFeeCount(client, 1),
      assetIndex: assetID,
    }),
    signer: account.signer,
  });
  const optInResult = await asyncWithTimeout(
    optInAtc.execute.bind(optInAtc),
    timeout,
    client,
    DEFAULT_AWAIT_ROUNDS
  );

  return optInResult;
}

/**
 * Normalizes a price value based on the provided decimals and direction.
 *
 * @param {number} price - The price value to normalize.
 * @param {number} decimals - The number of decimals to consider for normalization.
 * @param {PriceNormalizationType} direction - The direction of normalization. RAW = multiply by decimals, PRETTY = divide by decimals.
 * @param {number} precision - The precision to use when rounding the result. If not provided, the result is floored.
 *
 * @returns {number} - The normalized price.
 */
export function normalizePrice(
  price: number,
  decimals: number,
  direction = PriceNormalizationType.RAW, // RAW = multiply by decimals, PRETTY = divide by decimals
  precision?: number
): number {
  let result =
    direction === PriceNormalizationType.RAW
      ? price * 10 ** decimals
      : price / 10 ** decimals;

  if (precision) {
    const factor = 10 ** precision;
    result = Math.round(result * factor) / factor;
  } else {
    result = Math.floor(result);
  }

  return result;
}

export async function getAssetByID(
  client: Algodv2,
  assetID: number
): Promise<AssetMetadata> {
  if (assetID === 0) {
    return ALGO_ASSET;
  }

  // Fetch the asset by ID
  const assetResponse = await client.getAssetByID(assetID).do();
  const assetParams = assetResponse["params"];

  // Extract asset details
  const asset: AssetMetadata = {
    creator: assetParams["creator"],
    index: assetID,
    name: Object.prototype.hasOwnProperty.call(assetParams, "name")
      ? assetParams["name"]
      : "",
    decimals: assetParams["decimals"],
    unitName: assetParams["unit-name"],
  };

  return asset;
}

export function getTxnFeeCount(txnNumber: number): number {
  // Get suggested params with a specific fee.
  const fee = ALGORAND_MIN_TX_FEE * txnNumber;
  return fee;
}

export async function getParamsWithFeeCount(
  client: Algodv2,
  txnNumber: number
): Promise<algosdk.SuggestedParams> {
  // Get suggested params with a specific fee.
  const params: SuggestedParams = await client.getTransactionParams().do();
  params.flatFee = true;
  params.fee = getTxnFeeCount(txnNumber);
  return params;
}

// Price MBR calculations

export async function calculateExtraPages(
  approval: Uint8Array,
  clear: Uint8Array
): Promise<number> {
  return Math.floor((approval.length + clear.length) / APP_PAGE_MAX_SIZE);
}

export function calculateBoxMbr(
  name: string | number | Uint8Array,
  size: number,
  action: string,
  abiType: ABIType | null = null
): number {
  if (action !== "create" && action !== "destroy") {
    throw new Error("Action must be 'create' or 'destroy'");
  }
  const nameSize = typeof name === "number" ? name : name.length;
  let mbrChange = 2_500 + 400 * (nameSize + size);

  if (abiType !== null) {
    if (abiType instanceof ABIArrayDynamicType) {
      mbrChange += 800;
    } else {
      throw new Error(`Unknown abi type: ${abiType}`);
    }
  }

  return action === "create" ? mbrChange : -mbrChange;
}

export function calculateRegistryLockerBoxCreateMbr(
  locker_owner: string
): number {
  const uint64Type = new ABIUintType(64);
  return calculateBoxMbr(
    new Uint8Array([
      ...Buffer.from("cl-"),
      ...decodeAddress(locker_owner).publicKey,
    ]),
    uint64Type.byteLen(), // UInt64 is 8 bytes - 800 is microalgos
    "create"
  );
}

export function calculateProductDiscountBoxCreateMbr(): number {
  const uint64TypeByteLen = new ABIUintType(64).byteLen();
  const discountTypeByteLen = uint64TypeByteLen * 5; // 5 Uint64s in Discount tuple
  return calculateBoxMbr(uint64TypeByteLen, discountTypeByteLen, "create");
}

export function calculateProductSubscriptionBoxCreateMbr(
  subscriberAddress: string
): number {
  const uint64TypeByteLen = new ABIUintType(64).byteLen();
  const subscriptionTypeByteLen = uint64TypeByteLen * 5; // 5 Uint64s in Subscription tuple
  return calculateBoxMbr(
    decodeAddress(subscriberAddress).publicKey,
    subscriptionTypeByteLen,
    "create"
  );
}

export function calculateCreationMbr(
  extraProgramPages: number,
  globalNumUint: number,
  globalNumByteSlice: number
): number {
  return (
    100_000 * (1 + extraProgramPages) +
    (25_000 + 3_500) * globalNumUint +
    (25_000 + 25_000) * globalNumByteSlice
  );
}

export async function calculateProductCreationMbr(
  applicationSpec: ApplicationSpec,
  extraPages = 0,
  globalNumUint = 0,
  globalNumByteSlice = 0
): Promise<number> {
  const computedExtraPages = extraPages
    ? extraPages
    : await calculateExtraPages(
        applicationSpec.approval,
        applicationSpec.clear
      );

  return calculateCreationMbr(
    computedExtraPages,
    globalNumUint ?? applicationSpec.globalNumUint,
    globalNumByteSlice ?? applicationSpec.globalNumByteSlice
  );
}

export function calculateLockerCreationMbr(): number {
  return calculateCreationMbr(
    LOCKER_EXTRA_PAGES,
    LOCKER_GLOBAL_NUM_UINTS,
    LOCKER_GLOBAL_NUM_BYTE_SLICES
  );
}

/**
 * Determines the prefix for a locker box based on the provided lockerType.
 *
 * @param lockerType - The type of locker box. Can be either LockerType.CREATOR or LockerType.USER.
 * @returns A buffer representing the prefix for a locker box based on the provided lockerType.
 * @throws {Error} If the lockerType is unknown.
 *
 * @example
 * const prefix = getLockerBoxPrefix(LockerType.CREATOR);
 * console.log(prefix); // Output: <Buffer 63 6c 2d>
 */
export function getLockerBoxPrefix(lockerType: LockerType): Buffer {
  if (lockerType === LockerType.CREATOR) {
    return Buffer.from("cl-");
  } else if (lockerType === LockerType.USER) {
    return Buffer.from("ul-");
  } else {
    throw new Error(`Unknown locker type: ${lockerType}`);
  }
}

export function wait(ms: number) {
  const resp = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("TRANSACTION_SIGNING_TIMED_OUT")), ms)
  );

  return resp;
}

/**
 * Executes a function with a timeout.
 * @param {(...args: A) => Promise<T>} fn - The function to execute.
 * @param {number} timeout - The timeout in seconds.
 * @param {...A} args - The arguments to pass to the function.
 * @returns {Promise<T>} - A promise that resolves with the result of the function if it completes before the timeout.
 * @throws {Error} - If the function does not complete before the timeout.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function asyncWithTimeout<T, A extends any[]>(
  fn: (...args: A) => Promise<T>,
  timeout: number,
  ...args: A
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout error: exceeded ${timeout} seconds`));
    }, timeout * 1000);

    const resultPromise = fn(...args);
    if (!resultPromise || typeof resultPromise.then !== "function") {
      reject(new Error("Function did not return a promise"));
      return;
    }
    resultPromise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
  });
}

export function durationToMonths(duration: Duration | null): number {
  if (duration === Duration.UNLIMITED) {
    return 1;
  } else if (duration === Duration.MONTH) {
    return 1;
  } else if (duration === Duration.QUARTER) {
    return 3;
  } else if (duration === Duration.SEMI_ANNUAL) {
    return 6;
  } else if (duration === Duration.ANNUAL) {
    return 12;
  } else {
    throw new Error("Invalid expiration type");
  }
}

export function parseTokenProductGlobalState(input: AppState) {
  const keyMap: { [key: string]: string } = {
    gs_1: "product_name",
    gs_2: "subscription_name",
    gs_3: "manager",
    gs_4: "price",
    gs_5: "total_subscribers",
    gs_6: "max_subscribers",
    gs_7: "coin_id",
    gs_8: "product_type",
    gs_9: "lifecycle",
    gs_10: "created_at",
    gs_11: "oracle_id",
    gs_12: "unit_name",
    gs_13: "image_url",
    gs_14: "duration",
    gs_15: "extra_slot_1",
    gs_16: "extra_slot_2",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const output: { [key: string]: any } = {};

  for (const key in input) {
    if (keyMap[key]) {
      if (keyMap[key] === "manager") {
        output[keyMap[key]] = encodeAddress(
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          input[key].valueRaw
        );
      } else {
        output[keyMap[key]] = input[key].value;
      }
    }
  }

  return output;
}

export function encodeStringKey(key: string): Uint8Array {
  return new Uint8Array(Buffer.from(key, "utf-8"));
}
