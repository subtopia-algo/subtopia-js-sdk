// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

import algosdk, {
  LogicSigAccount,
  AtomicTransactionComposer,
  encodeAddress,
  makeLogicSigAccountTransactionSigner,
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
import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";
import { StateValue, State, ApplicationClient } from "beaker-ts";

import {
  ApplicationSpec,
  AssetMetadata,
  Locker,
  LockerRekeyParameters,
  User,
} from "../interfaces";
import { DEFAULT_AWAIT_ROUNDS, ALGO_ASSET } from "../constants";
import { PriceNormalizationType, SubscriptionExpirationType } from "../enums";
import { APP_PAGE_MAX_SIZE } from "@algorandfoundation/algokit-utils/types/app";

/* c8 ignore start */
function strOrHex(v: Buffer): string {
  try {
    const response = v.toString(`utf-8`);
    try {
      if (response && v.toString(`hex`).length === 64) {
        const addressString = encodeAddress(new Uint8Array(v));
        return addressString;
      }
    } catch (e) {
      return response;
    }
    return response;
  } catch (e) {
    return v.toString(`hex`);
  }
}

export async function debugPcCode(client: ApplicationClient, pcLine: number) {
  const [, appMap] = await client.compile(
    Buffer.from(client.approvalProgram as string, "base64").toString()
  );

  return appMap.pcToLine[pcLine];
}

function decodeState(state: StateValue[], raw?: boolean): State {
  const obj = {} as State;

  // Start with empty set
  for (const stateVal of state) {
    const keyBuff = Buffer.from(stateVal.key, `base64`);
    const key = raw ? keyBuff.toString(`hex`) : strOrHex(keyBuff);
    const value = stateVal.value;

    // In both global-state and state deltas, 1 is bytes and 2 is int
    const dataTypeFlag = value.action ? value.action : value.type;
    switch (dataTypeFlag) {
      case 1:
        // eslint-disable-next-line no-case-declarations
        const valBuff = Buffer.from(value.bytes, `base64`);
        obj[key] = raw ? new Uint8Array(valBuff) : strOrHex(valBuff);
        break;
      case 2:
        obj[key] = value.uint;
        break;
      default: // ??
    }
  }

  return obj;
}
/* c8 ignore stop */

export async function loadApplicationState(
  client: AlgodClient,
  appId: number,

  raw?: boolean
): Promise<State> {
  const appInfo = await client.getApplicationByID(appId).do();

  if (!(`params` in appInfo) || !(`global-state` in appInfo[`params`]))
    throw new Error(`No global state found`);

  const decoded = decodeState(appInfo[`params`][`global-state`], raw);

  return decoded;
}

export function addressToHex(address: string): string {
  return (
    "0x" +
    Buffer.from(algosdk.decodeAddress(address).publicKey).toString("hex") +
    " // addr " +
    address
  );
}

export async function getLocker(
  client: AlgodClient,
  creatorAddress: string,
  registryAddress: string
): Promise<Locker> {
  // load sml.teal file into string
  let sml = "SML_TEAL";

  // replace TMPL_CREATOR_ADDRESS with decoded creator address
  sml = sml.replace(`TMPL_CREATOR_ADDRESS`, addressToHex(creatorAddress));

  // replace TMPL_REGISTRY_ADDRESS with decoded registry address
  sml = sml.replace(`TMPL_REGISTRY_ADDRESS`, addressToHex(registryAddress));

  // compile sml.teal
  const response = await client.compile(sml).do();
  const compiled = new Uint8Array(Buffer.from(response.result, `base64`));

  // wrap compiled sml.teal in LogicSigAccount
  const smlAccount = new LogicSigAccount(compiled);

  const lockerInfo = await client.accountInformation(smlAccount.address()).do();
  const authAddress = lockerInfo["auth-addr"] || smlAccount.address();

  return {
    lsig: smlAccount,
    authAddress: authAddress,
    signer: makeLogicSigAccountTransactionSigner(smlAccount),
  };
}

export async function rekeyLocker(params: LockerRekeyParameters): Promise<{
  confirmedRound: number;
  txIDs: string[];
  methodResults: SdkABIResult[];
}> {
  const lsigSigner = makeLogicSigAccountTransactionSigner(params.locker);
  const sp = await getParamsWithFeeCount(params.client, 2);

  const atc = new AtomicTransactionComposer();
  atc.addTransaction({
    txn: algosdk.makePaymentTxnWithSuggestedParams(
      params.creatorAddress,
      params.locker.address(),
      100_000,
      undefined,
      undefined,
      sp
    ),
    signer: params.creatorSigner,
  });

  const rekey_sp = Object.assign({}, sp);
  rekey_sp.fee = 0;
  const rekeySigner =
    params.registryAddress === params.rekeyToAddress
      ? lsigSigner
      : params.registrySigner;
  atc.addTransaction({
    txn: algosdk.makePaymentTxnWithSuggestedParams(
      params.locker.address(),
      params.locker.address(),
      0,
      undefined,
      undefined,
      rekey_sp,
      params.rekeyToAddress
    ),
    signer: rekeySigner,
  });

  return await atc.execute(params.client, DEFAULT_AWAIT_ROUNDS);
}

export async function optInAsset(
  client: Algodv2,
  user: User,
  passId: number
): Promise<{
  confirmedRound: number;
  txIDs: string[];
  methodResults: SdkABIResult[];
}> {
  const optInAtc = new AtomicTransactionComposer();
  optInAtc.addTransaction({
    txn: makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: user.address,
      to: user.address,
      amount: 0,
      suggestedParams: await getParamsWithFeeCount(client, 1),
      assetIndex: passId,
    }),
    signer: user.signer,
  });
  const optInResult = await optInAtc.execute(client, DEFAULT_AWAIT_ROUNDS);

  console.log("Opted in to pass", optInResult);
  return optInResult;
}

export async function optOutAsset(
  client: Algodv2,
  user: User,
  passId: number
): Promise<{
  confirmedRound: number;
  txIDs: string[];
  methodResults: SdkABIResult[];
}> {
  const optInAtc = new AtomicTransactionComposer();
  optInAtc.addTransaction({
    txn: makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: user.address,
      to: user.address,
      closeRemainderTo: user.address,
      amount: 0,
      suggestedParams: await getParamsWithFeeCount(client, 1),
      assetIndex: passId,
    }),
    signer: user.signer,
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

export function expirationTypeToMonths(
  expirationType: SubscriptionExpirationType
): number {
  if (expirationType === SubscriptionExpirationType.MONTHLY) {
    return 1;
  } else if (expirationType === SubscriptionExpirationType.QUARTERLY) {
    return 3;
  } else if (expirationType === SubscriptionExpirationType.SEMI_ANNUAL) {
    return 6;
  } else if (expirationType === SubscriptionExpirationType.ANNUAL) {
    return 12;
  } else {
    return 1;
  }
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

export function calculateInfrastructureDiscountBoxCreateMbr(): number {
  const uint64TypeByteLen = new ABIUintType(64).byteLen();
  const discountTypeByteLen = uint64TypeByteLen * 6; // 6 Uint64s in Discount tuple
  return calculateBoxMbr(uint64TypeByteLen, discountTypeByteLen, "create");
}

export function calculateInfrastructureSubscriptionBoxCreateMbr(
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
