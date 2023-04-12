// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

import algosdk, {
  LogicSigAccount,
  AtomicTransactionComposer,
  encodeAddress,
  makeLogicSigAccountTransactionSigner,
  TransactionSigner,
  makeAssetTransferTxnWithSuggestedParamsFromObject,
  Algodv2,
  ALGORAND_MIN_TX_FEE,
  SuggestedParams,
} from "algosdk";
import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";
import { StateValue, State, ApplicationClient } from "beaker-ts";
import { ALGO_ASSET, DEFAULT_AWAIT_ROUNDS } from "./constants";
import { PriceNormalizationType, SubscriptionExpirationType } from "./enums";
import { LockerRekeyParameters, AssetMetadata, Locker } from "./interfaces";
import { SML_TEAL } from "../contracts/sml_client";

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
  let sml = SML_TEAL;

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
  methodResults: algosdk.ABIResult[];
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
  userAddress: string,
  userSigner: TransactionSigner,
  passId: number
) {
  const optInAtc = new AtomicTransactionComposer();
  optInAtc.addTransaction({
    txn: makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: userAddress,
      to: userAddress,
      amount: 0,
      suggestedParams: await getParamsWithFeeCount(client, 1),
      assetIndex: passId,
    }),
    signer: userSigner,
  });
  const optInResult = await optInAtc.execute(client, DEFAULT_AWAIT_ROUNDS);

  console.log("Opted in to pass", optInResult);
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

export async function debugPcCode(client: ApplicationClient, pcLine: number) {
  const [, appMap] = await client.compile(
    Buffer.from(client.approvalProgram as string, "base64").toString()
  );

  return appMap.pcToLine[pcLine];
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

export async function getParamsWithFeeCount(
  client: Algodv2,
  txnNumber: number
): Promise<algosdk.SuggestedParams> {
  // Get suggested params with a specific fee.
  const params: SuggestedParams = await client.getTransactionParams().do();
  params.flatFee = true;
  params.fee = ALGORAND_MIN_TX_FEE * txnNumber;
  return params;
}

export function expirationTypeToMonths(
  expirationType: SubscriptionExpirationType
): number {
  if (expirationType === SubscriptionExpirationType.UNLIMITED) {
    return 1;
  } else if (expirationType === SubscriptionExpirationType.MONTHLY) {
    return 1;
  } else if (expirationType === SubscriptionExpirationType.QUARTERLY) {
    return 3;
  } else if (expirationType === SubscriptionExpirationType.SEMI_ANNUAL) {
    return 6;
  } else if (expirationType === SubscriptionExpirationType.ANNUAL) {
    return 12;
  } else {
    throw new Error("Invalid expiration type");
  }
}
