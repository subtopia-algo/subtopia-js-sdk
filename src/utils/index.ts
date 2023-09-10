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
} from "algosdk";

import { ApplicationSpec, AssetMetadata } from "../interfaces";
import { DEFAULT_AWAIT_ROUNDS, ALGO_ASSET } from "../constants";
import { LockerType, PriceNormalizationType } from "../enums";
import { APP_PAGE_MAX_SIZE } from "@algorandfoundation/algokit-utils/types/app";
import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";

export async function optInAsset({
  client,
  account,
  assetID,
}: {
  client: Algodv2;
  account: TransactionSignerAccount;
  assetID: number;
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
  const optInResult = await optInAtc.execute(client, DEFAULT_AWAIT_ROUNDS);

  console.log("Opted in to pass", optInResult);
  return optInResult;
}

export async function optOutAsset({
  client,
  account,
  assetID,
}: {
  client: Algodv2;
  account: TransactionSignerAccount;
  assetID: number;
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
  const optInResult = await optInAtc.execute(client, DEFAULT_AWAIT_ROUNDS);

  console.log("Opted out from pass", optInResult);
  return optInResult;
}

export function normalizePrice(
  price: number,
  decimals: number,
  direction = PriceNormalizationType.RAW // RAW = multiply by decimals, PRETTY = divide by decimals
): number {
  return direction === PriceNormalizationType.RAW
    ? Math.floor(price * 10 ** decimals)
    : Math.floor(price / 10 ** decimals);
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
    decodeAddress(locker_owner).publicKey,
    uint64Type.byteLen(), // UInt64 is 8 bytes - 800 is microalgos
    "create"
  );
}

export function calculateProductDiscountBoxCreateMbr(): number {
  const uint64TypeByteLen = new ABIUintType(64).byteLen();
  const discountTypeByteLen = uint64TypeByteLen * 6; // 6 Uint64s in Discount tuple
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

export async function calculateSmiCreationMbr(
  applicationSpec: ApplicationSpec
): Promise<number> {
  const extraPages = await calculateExtraPages(
    applicationSpec.approval,
    applicationSpec.clear
  );
  return calculateCreationMbr(
    extraPages,
    applicationSpec.globalNumUint,
    applicationSpec.globalNumByteSlice
  );
}

export async function calculateSmlCreationMbr(
  applicationSpec: ApplicationSpec
): Promise<number> {
  const extraPages = await calculateExtraPages(
    applicationSpec.approval,
    applicationSpec.clear
  );
  return calculateCreationMbr(
    extraPages,
    applicationSpec.globalNumUint,
    applicationSpec.globalNumByteSlice
  );
}

export function getLockerBoxPrefix(lockerType: LockerType): Buffer {
  if (lockerType === LockerType.CREATOR) {
    return Buffer.from("cl-");
  } else if (lockerType === LockerType.USER) {
    return Buffer.from("ul-");
  } else {
    throw new Error(`Unknown locker type: ${lockerType}`);
  }
}
