// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

import algosdk, {
  ABIStringType,
  ABIType,
  AtomicTransactionComposer,
  TransactionSigner,
  algosToMicroalgos,
  decodeAddress,
  encodeAddress,
  encodeUint64,
  makeAssetTransferTxnWithSuggestedParamsFromObject,
  makePaymentTxnWithSuggestedParamsFromObject,
} from "algosdk";
import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";
import {
  loadApplicationState,
  getLocker,
  normalizePrice,
  optInAsset,
  getParamsWithFeeCount,
  rekeyLocker,
  expirationTypeToMonths,
  calculateSmiCreationMbr,
  convertCentsToAlgos,
  calculateSmlCreationMbr,
  calculateRegistryLockerBoxCreateMbr,
  getTxnFeeCount,
} from "../utils";
import { Discount, SMI, Subscription } from "../contracts/smi_client";
import { SmrClient } from "../contracts/SMR";
import { getAssetByID } from "../utils";
import {
  SUBTOPIA_REGISTRY_APP_ID,
  DEFAULT_AWAIT_ROUNDS,
  SMI_APPROVAL_KEY,
  SMI_CLEAR_KEY,
  MIN_APP_OPTIN_MBR,
  MIN_APP_BALANCE_MBR,
  MIN_ASA_OPTIN_MBR,
  SMI_CREATION_PLATFORM_FEE_CENTS,
  SMI_VERSION,
  SMR_VERSION,
  SML_APPROVAL_KEY,
  SML_CLEAR_KEY,
} from "../constants";
import {
  SubscriptionType,
  SubscriptionExpirationType,
  PriceNormalizationType,
  DiscountType,
} from "../enums";
import {
  SMIState,
  SubscriptionRecord,
  DiscountRecord,
  SMISubscribeParams,
  ChainMethodParams,
  SMIUnsubscribeParams,
  SMIClaimSubscriptionParams,
  SMIClaimRevenueParams,
  SMITransferSubscriptionParams,
  SMIMarkForDeletionParams,
  SMIDeleteSubscriptionParams,
  SMICreateDiscountParams,
  SMIDeleteDiscountParams,
  SMRAddInfrastructureParams,
} from "../interfaces";

import {
  getAppClient,
  microAlgos,
  transactionFees,
} from "@algorandfoundation/algokit-utils";
import { ApplicationClient } from "@algorandfoundation/algokit-utils/types/app-client";
import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";
import { SmaClient } from "../contracts/SMA";
import {
  AppCallTransactionResultOfType,
  AppReference,
} from "@algorandfoundation/algokit-utils/types/app";

const STP_IMAGE_URL =
  "ipfs://bafybeicddz7kbuxajj6bob5bjqtweq6wchkdkiq4vvhwrwrne7iz4f25xi";
const STP_UNIT_NAME = "STP";
const encoder = new TextEncoder();

export class SubtopiaRegistry {
  algodClient: algosdk.Algodv2;
  registryClient: SmrClient;
  smaClient: SmaClient;
  creator: TransactionSignerAccount;
  version: string;
  appId: number;
  appAddress;

  private constructor(
    algodClient: AlgodClient,
    creator: TransactionSignerAccount,
    registryClient: SmrClient,
    appReference: AppReference,
    smaClient: SmaClient,
    version: string
  ) {
    this.algodClient = algodClient;
    this.creator = creator;
    this.registryClient = registryClient;
    this.appAddress = appReference.appAddress;
    this.appId = Number(appReference.appId);
    this.smaClient = smaClient;
    this.version = version;
  }

  public static async init(
    algodClient: AlgodClient,
    creator: TransactionSignerAccount,
    smrId: number = SUBTOPIA_REGISTRY_APP_ID
  ): Promise<SubtopiaRegistry> {
    const registryClient = new SmrClient(
      {
        resolveBy: "id",
        sender: creator,
        id: smrId,
      },
      algodClient
    );

    const state = (await registryClient.getGlobalState()).sma_id;

    if (!state) {
      throw new Error("SMR is not initialized");
    }

    const smaClient = new SmaClient(
      {
        resolveBy: "id",
        sender: creator,
        id: state.asNumber(),
      },
      algodClient
    );

    const versionAtc = await registryClient.compose().getVersion({}).atc();
    const response = await versionAtc.simulate(algodClient);
    const version = response.methodResults[0].returnValue as string;
    const appReference =
      (await registryClient.appClient.getAppReference()) as AppReference;

    return new SubtopiaRegistry(
      algodClient,
      creator,
      registryClient,
      appReference,
      smaClient,
      version
    );
  }

  public async getAddress(): Promise<string> {
    const reference = await this.registryClient.appClient.getAppReference();
    return reference.appAddress;
  }

  public async getInfrastructureCreationFee(coinID = 0): Promise<number> {
    return (
      algosToMicroalgos(MIN_APP_OPTIN_MBR) +
      algosToMicroalgos(MIN_APP_BALANCE_MBR) +
      (await calculateSmiCreationMbr(this.algodClient)) +
      (coinID > 0 ? algosToMicroalgos(MIN_ASA_OPTIN_MBR) : 0)
    );
  }

  public async getInfrastructureCreationPlatformFee(): Promise<number> {
    const currentPrice = (await this.smaClient.getGlobalState()).price;
    if (!currentPrice) {
      throw new Error("SMA is not initialized");
    }

    return convertCentsToAlgos(
      SMI_CREATION_PLATFORM_FEE_CENTS,
      currentPrice.asNumber()
    );
  }

  public async getLockerCreationFee(creatorAddress: string): Promise<number> {
    return (
      algosToMicroalgos(MIN_APP_OPTIN_MBR) +
      (await calculateSmlCreationMbr(this.algodClient)) +
      calculateRegistryLockerBoxCreateMbr(creatorAddress)
    );
  }

  public async createLocker({
    creator,
  }: {
    creator: TransactionSignerAccount;
  }): Promise<{
    txId: string;
    lockerId: number;
  }> {
    const feeAmount = await this.getLockerCreationFee(creator.addr);

    const response = await this.registryClient
      .compose()
      .createSml(
        {
          manager: creator.addr,
          fee_txn: makePaymentTxnWithSuggestedParamsFromObject({
            from: creator.addr,
            to: this.appAddress,
            amount: feeAmount,
            suggestedParams: await getParamsWithFeeCount(this.algodClient, 0),
          }),
        },
        {
          sendParams: {
            fee: transactionFees(4),
          },
          boxes: [
            {
              appIndex: this.appId,
              name: decodeAddress(creator.addr).publicKey,
            },
            {
              appIndex: this.appId,
              name: encoder.encode(SML_APPROVAL_KEY),
            },
            {
              appIndex: this.appId,
              name: encoder.encode(SML_CLEAR_KEY),
            },
          ],
        }
      )
      .execute();

    return {
      txId: response.txIds.pop() as string,
      lockerId: Number(response.returns[0]),
    };
  }

  public async getLocker(creatorAddress: string): Promise<number | undefined> {
    const atc = await this.registryClient
      .compose()
      .getSml(
        {
          manager: creatorAddress,
        },
        {
          boxes: [
            {
              appIndex: this.appId,
              name: decodeAddress(creatorAddress).publicKey,
            },
          ],
        }
      )
      .atc();

    const response = await atc.simulate(this.algodClient);
    const lockerId = Number(response.methodResults[0].returnValue);
    return lockerId > 0 ? lockerId : undefined;
  }

  public async createInfrastructure({
    name,
    price,
    lockerId,
    subType = SubscriptionType.UNLIMITED,
    maxSubs = 0,
    coinID = 0,
    unitName = STP_UNIT_NAME,
    imageUrl = STP_IMAGE_URL,
  }: {
    name: string;
    price: number;
    lockerId: number;
    subType?: SubscriptionType;
    maxSubs?: number;
    coinID?: number;
    unitName?: string;
    imageUrl?: string;
  }): Promise<{
    txId: string;
    infrastructureId: number;
  }> {
    const asset = await getAssetByID(this.algodClient, coinID);

    const smaID = (await this.registryClient.getGlobalState()).sma_id;
    if (!smaID) {
      throw new Error("SMR is not initialized");
    }

    const adminAddress = encodeAddress(
      (await this.smaClient.getGlobalState()).admin?.asByteArray() as Uint8Array
    );
    const feeAmount = await this.getInfrastructureCreationFee(coinID);
    const platformFeeAmount = await this.getInfrastructureCreationPlatformFee();

    const response = await this.registryClient
      .compose()
      .createSmi(
        {
          name: name,
          manager: this.creator.addr,
          sub_type: Number(subType),
          price: normalizePrice(
            price,
            asset.decimals,
            PriceNormalizationType.RAW
          ),
          max_subs: maxSubs,
          coin: coinID,
          unit_name: unitName,
          image_url: imageUrl,
          fee_txn: makePaymentTxnWithSuggestedParamsFromObject({
            from: this.creator.addr,
            to: this.appAddress,
            amount: feeAmount,
            suggestedParams: await getParamsWithFeeCount(this.algodClient, 0),
          }),
          platform_fee_txn: makePaymentTxnWithSuggestedParamsFromObject({
            from: this.creator.addr,
            to: adminAddress,
            amount: platformFeeAmount,
            suggestedParams: await getParamsWithFeeCount(this.algodClient, 0),
          }),
          sma: smaID.asNumber(),
          locker: lockerId,
        },
        {
          sendParams: {
            fee: transactionFees(8),
          },
          boxes: [
            {
              appIndex: this.appId,
              name: decodeAddress(this.creator.addr).publicKey,
            },
            {
              appIndex: this.appId,
              name: encoder.encode(SMI_APPROVAL_KEY),
            },
            {
              appIndex: this.appId,
              name: encoder.encode(SMI_APPROVAL_KEY),
            },
            {
              appIndex: this.appId,
              name: encoder.encode(SMI_APPROVAL_KEY),
            },
            {
              appIndex: this.appId,
              name: encoder.encode(SMI_CLEAR_KEY),
            },
          ],
        }
      )
      .execute()
      .catch((e) => {
        console.log(e);
        throw e;
      });

    return {
      txId: response.txIds.pop() as string,
      infrastructureId: Number(response.returns[0]),
    };
  }
}
