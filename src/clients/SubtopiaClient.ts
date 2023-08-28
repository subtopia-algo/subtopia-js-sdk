// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

import algosdk, {
  ABIMethod,
  AtomicTransactionComposer,
  algosToMicroalgos,
  decodeAddress,
  encodeAddress,
  encodeUint64,
  getApplicationAddress,
  makeAssetTransferTxnWithSuggestedParamsFromObject,
  makePaymentTxnWithSuggestedParamsFromObject,
} from "algosdk";
import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";
import {
  normalizePrice,
  getParamsWithFeeCount,
  calculateSmiCreationMbr,
  calculateSmlCreationMbr,
  calculateRegistryLockerBoxCreateMbr,
  calculateInfrastructureDiscountBoxCreateMbr,
  calculateInfrastructureSubscriptionBoxCreateMbr,
} from "../utils";
import { getAssetByID } from "../utils";
import {
  MIN_APP_OPTIN_MBR,
  MIN_APP_BALANCE_MBR,
  MIN_ASA_OPTIN_MBR,
  SUBSCRIPTION_PLATFORM_FEE_CENTS,
  TESTNET_SUBTOPIA_REGISTRY_ID,
} from "../constants";
import {
  PriceNormalizationType,
  SubscriptionExpirationType,
  DiscountType,
  Duration,
} from "../enums";

import {
  getAppById,
  getAppGlobalState,
} from "@algorandfoundation/algokit-utils";
import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";
import { SubtopiaRegistryClient } from "./SubtopiaRegistryClient";
import {
  ApplicationSpec,
  AssetMetadata,
  RawDiscount,
  SubscriptionRecord,
} from "interfaces";

const encoder = new TextEncoder();

export class SubtopiaClient {
  algodClient: algosdk.Algodv2;
  creator: TransactionSignerAccount;
  price: number;
  coin: AssetMetadata;
  oracleID: number;
  version: string;
  appID: number;
  appAddress: string;
  appSpec: ApplicationSpec;

  private constructor({
    algodClient,
    creator,
    appID,
    appAddress,
    appSpec,
    oracleID,
    price,
    coin,
    version,
  }: {
    algodClient: AlgodClient;
    creator: TransactionSignerAccount;
    appSpec: ApplicationSpec;
    appID: number;
    appAddress: string;
    oracleID: number;
    price: number;
    coin: AssetMetadata;
    version: string;
  }) {
    this.algodClient = algodClient;
    this.creator = creator;
    this.appID = appID;
    this.appAddress = appAddress;
    this.appSpec = appSpec;
    this.oracleID = oracleID;
    this.price = price;
    this.coin = coin;
    this.version = version;
  }

  public static async init(
    algodClient: AlgodClient,
    productID: number,
    creator: TransactionSignerAccount
  ): Promise<SubtopiaClient> {
    const productGlobalState = await getAppGlobalState(
      productID,
      algodClient
    ).catch((error) => {
      throw new Error(error);
    });

    if (
      !productGlobalState.price ||
      !productGlobalState.oracle_id ||
      !productGlobalState.coin_id
    ) {
      throw new Error("SMR is not initialized");
    }

    const oracleID = productGlobalState.oracle_id.value as number;
    const productAddress = getApplicationAddress(productID);
    const productPrice = productGlobalState.price.value as number;
    const productSpec = await getAppById(productID, algodClient);

    const versionAtc = new AtomicTransactionComposer();
    versionAtc.addMethodCall({
      appID: productID,
      method: new ABIMethod({
        name: "get_version",
        args: [],
        returns: { type: "string" },
      }),
      sender: creator.addr,
      signer: creator.signer,
      suggestedParams: await getParamsWithFeeCount(algodClient, 1),
    });
    const response = await versionAtc.simulate(algodClient);
    const version = response.methodResults[0].returnValue as string;
    const coin = await getAssetByID(
      algodClient,
      productGlobalState.coin_id.value as number
    );

    return new SubtopiaClient({
      algodClient,
      creator,
      appID: productID,
      appAddress: productAddress,
      appSpec: {
        approval: productSpec.params.approvalProgram,
        clear: productSpec.params.clearStateProgram,
        globalNumUint:
          Number(productSpec.params.globalStateSchema?.numUint) || 0,
        globalNumByteSlice:
          Number(productSpec.params.globalStateSchema?.numByteSlice) || 0,
        localNumUint: Number(productSpec.params.localStateSchema?.numUint) || 0,
        localNumByteSlice:
          Number(productSpec.params.localStateSchema?.numByteSlice) || 0,
      },
      oracleID,
      price: productPrice,
      coin,
      version,
    });
  }

  public async getSubscriptionPrice(coinID = 0): Promise<number> {
    return (
      algosToMicroalgos(MIN_APP_OPTIN_MBR) +
      algosToMicroalgos(MIN_APP_BALANCE_MBR) +
      (await calculateSmiCreationMbr(this.appSpec)) +
      (coinID > 0 ? algosToMicroalgos(MIN_ASA_OPTIN_MBR) : 0)
    );
  }

  public async getSubscriptionPlatformFee(
    priceInCents: number
  ): Promise<number> {
    const computePlatformFeeAtc = new AtomicTransactionComposer();
    computePlatformFeeAtc.addMethodCall({
      appID: this.oracleID,
      method: new ABIMethod({
        name: "compute_platform_fee",
        args: [
          {
            type: "uint64",
            name: "whole_usd",
            desc: "Amount of USD in whole numbers (CENTS)",
          },
        ],
        returns: { type: "uint64" },
      }),
      methodArgs: [priceInCents],
      sender: this.creator.addr,
      signer: this.creator.signer,
      suggestedParams: await getParamsWithFeeCount(this.algodClient, 1),
    });

    const response = await computePlatformFeeAtc.simulate(this.algodClient);

    return Number(response.methodResults[0].returnValue);
  }

  public async getLockerCreationFee(creatorAddress: string): Promise<number> {
    return (
      algosToMicroalgos(MIN_APP_OPTIN_MBR) +
      (await calculateSmlCreationMbr(this.appSpec)) +
      calculateRegistryLockerBoxCreateMbr(creatorAddress)
    );
  }

  public async getDiscount({
    expirationType,
  }: {
    expirationType: SubscriptionExpirationType;
  }): Promise<RawDiscount> {
    const getDiscountAtc = new AtomicTransactionComposer();
    getDiscountAtc.addMethodCall({
      appID: this.appID,
      method: new ABIMethod({
        name: "get_discount",
        args: [
          {
            type: "uint64",
            name: "duration",
            desc: "The duration of the discount.",
          },
        ],
        returns: { type: "uint64" },
      }),
      methodArgs: [expirationType.valueOf()],
      sender: this.creator.addr,
      signer: this.creator.signer,
      suggestedParams: await getParamsWithFeeCount(this.algodClient, 1),
    });

    const response = await getDiscountAtc.simulate(this.algodClient);

    return response.methodResults[0].returnValue?.valueOf() as RawDiscount;
  }

  public async createDiscount({
    duration,
    discountType,
    discountValue,
    expiresIn,
  }: {
    duration: Duration;
    discountType: DiscountType;
    discountValue: number;
    expiresIn: number;
  }): Promise<{
    txId: string;
  }> {
    const createDiscountAtc = new AtomicTransactionComposer();
    createDiscountAtc.addMethodCall({
      appID: this.appID,
      method: new ABIMethod({
        name: "create_discount",
        args: [
          {
            type: "uint64",
            name: "duration",
            desc: "The duration of the discount.",
          },
          {
            type: "uint64",
            name: "discount_type",
            desc: "The type of discount (percentage or amount).",
          },
          {
            type: "uint64",
            name: "discount_value",
            desc: "The discount value in micro ALGOs.",
          },
          {
            type: "uint64",
            name: "expires_in",
            desc: "The number of seconds to append to creation date",
          },
          {
            type: "pay",
            name: "fee_txn",
            desc: "The transaction fee.",
          },
        ],
        returns: { type: "void" },
      }),
      methodArgs: [
        duration.valueOf(),
        discountType.valueOf(),
        discountValue,
        expiresIn,
        {
          txn: makePaymentTxnWithSuggestedParamsFromObject({
            from: this.creator.addr,
            to: this.appAddress,
            amount: calculateInfrastructureDiscountBoxCreateMbr(),
            suggestedParams: await getParamsWithFeeCount(this.algodClient, 0),
          }),
          signer: this.creator.signer,
        },
      ],
      boxes: [
        {
          appIndex: this.appID,
          name: encoder.encode(duration.valueOf().toString()),
        },
      ],
      sender: this.creator.addr,
      signer: this.creator.signer,
      suggestedParams: await getParamsWithFeeCount(this.algodClient, 1),
    });

    const response = await createDiscountAtc.execute(this.algodClient, 10);

    return {
      txId: response.txIDs.pop() as string,
    };
  }

  public async createSubscription({
    subscriber,
    expirationType,
  }: {
    subscriber: TransactionSignerAccount;
    expirationType: SubscriptionExpirationType;
  }): Promise<{
    txId: string;
    subscriptionId: number;
  }> {
    const oracleAdminState = (
      await getAppGlobalState(this.oracleID, this.algodClient)
    ).admin;
    const adminAddress = encodeAddress(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      oracleAdminState.valueRaw
    );
    const platformFeeAmount = await this.getSubscriptionPlatformFee(
      SUBSCRIPTION_PLATFORM_FEE_CENTS
    );
    const creatorLockerId = await SubtopiaRegistryClient.getLocker({
      registryID: TESTNET_SUBTOPIA_REGISTRY_ID,
      algodClient: this.algodClient,
      ownerAddress: this.creator.addr,
    });

    if (!creatorLockerId) {
      throw new Error("Creator locker is not initialized");
    }

    const lockerAddress = getApplicationAddress(creatorLockerId);

    const createSubscriptionAtc = new AtomicTransactionComposer();
    createSubscriptionAtc.addMethodCall({
      appID: this.appID,
      method: new ABIMethod({
        name: "create_subscription",
        args: [
          {
            type: "address",
            name: "subscriber",
            desc: "The subscriber's address.",
          },
          {
            type: "uint64",
            name: "duration",
            desc: "The duration of the subscription.",
          },
          {
            type: "application",
            name: "creator_locker",
            desc: "The locker of creator",
          },
          {
            type: "application",
            name: "oracle_id",
            desc: "The oracle app used.",
          },
          {
            type: "pay",
            name: "fee_txn",
            desc: "The transaction fee paid to the app.",
          },
          {
            type: "pay",
            name: "platform_fee_txn",
            desc: "The platform fee paid.",
          },
          {
            type: "txn",
            name: "pay_txn",
            desc: "The payment transaction to fund the subscription.",
          },
        ],
        returns: { type: "uint64" },
      }),
      methodArgs: [
        subscriber.addr,
        expirationType.valueOf(),
        creatorLockerId,
        this.oracleID,
        {
          txn: makePaymentTxnWithSuggestedParamsFromObject({
            from: subscriber.addr,
            to: this.appAddress,
            amount:
              calculateInfrastructureSubscriptionBoxCreateMbr(subscriber.addr) +
              algosToMicroalgos(MIN_APP_OPTIN_MBR),
            suggestedParams: await getParamsWithFeeCount(this.algodClient, 0),
          }),
          signer: subscriber.signer,
        },
        {
          txn: makePaymentTxnWithSuggestedParamsFromObject({
            from: subscriber.addr,
            to: adminAddress,
            amount: platformFeeAmount,
            suggestedParams: await getParamsWithFeeCount(this.algodClient, 0),
          }),
          signer: subscriber.signer,
        },
        this.coin.index === 0
          ? {
              txn: makePaymentTxnWithSuggestedParamsFromObject({
                from: subscriber.addr,
                to: lockerAddress,
                amount: this.price,
                suggestedParams: await getParamsWithFeeCount(
                  this.algodClient,
                  0
                ),
              }),
              signer: subscriber.signer,
            }
          : {
              txn: makeAssetTransferTxnWithSuggestedParamsFromObject({
                from: subscriber.addr,
                to: lockerAddress,
                amount: normalizePrice(
                  this.price,
                  this.coin.decimals,
                  PriceNormalizationType.RAW
                ),
                assetIndex: this.coin.index,
                suggestedParams: await getParamsWithFeeCount(
                  this.algodClient,
                  0
                ),
              }),
              signer: subscriber.signer,
            },
      ],
      boxes: [
        {
          appIndex: this.appID,
          name: decodeAddress(subscriber.addr).publicKey,
        },
        {
          appIndex: this.appID,
          name: encodeUint64(expirationType.valueOf()),
        },
      ],
      sender: subscriber.addr,
      signer: subscriber.signer,
      suggestedParams: await getParamsWithFeeCount(
        this.algodClient,
        this.coin.index > 0 ? 6 : 5
      ),
    });

    const response = await createSubscriptionAtc.execute(this.algodClient, 10);

    return {
      txId: response.txIDs.pop() as string,
      subscriptionId: Number(response.methodResults[0].returnValue),
    };
  }

  public async transferSubscription({
    oldSubscriber,
    newSubscriberAddress,
    subscriptionID,
  }: {
    oldSubscriber: TransactionSignerAccount;
    newSubscriberAddress: string;
    subscriptionID: number;
  }): Promise<{
    txId: string;
  }> {
    const transferSubscriptionAtc = new AtomicTransactionComposer();
    transferSubscriptionAtc.addMethodCall({
      appID: this.appID,
      method: new ABIMethod({
        name: "transfer_subscription",
        args: [
          {
            type: "address",
            name: "new_subscriber",
            desc: "The new address to transfer the subscription to.",
          },
          {
            type: "asset",
            name: "subscription",
            desc: "The subscription asset.",
          },
        ],
        returns: { type: "void" },
      }),
      boxes: [
        {
          appIndex: this.appID,
          name: decodeAddress(oldSubscriber.addr).publicKey,
        },
        {
          appIndex: this.appID,
          name: decodeAddress(newSubscriberAddress).publicKey,
        },
      ],
      methodArgs: [newSubscriberAddress, subscriptionID],
      sender: oldSubscriber.addr,
      signer: oldSubscriber.signer,
      suggestedParams: await getParamsWithFeeCount(this.algodClient, 2),
    });

    const response = await transferSubscriptionAtc.execute(
      this.algodClient,
      10
    );

    return {
      txId: response.txIDs.pop() as string,
    };
  }

  public async claimSubscription({
    subscriber,
    subscriptionID,
  }: {
    subscriber: TransactionSignerAccount;
    subscriptionID: number;
  }): Promise<{
    txId: string;
  }> {
    const claimSubscriptionAtc = new AtomicTransactionComposer();
    claimSubscriptionAtc.addMethodCall({
      appID: this.appID,
      method: new ABIMethod({
        name: "claim_subscription",
        args: [
          {
            type: "asset",
            name: "subscription",
            desc: "The subscription ASA ID.",
          },
        ],
        returns: { type: "void" },
      }),
      methodArgs: [subscriptionID],
      boxes: [
        {
          appIndex: this.appID,
          name: decodeAddress(subscriber.addr).publicKey,
        },
      ],
      sender: subscriber.addr,
      signer: subscriber.signer,
      suggestedParams: await getParamsWithFeeCount(this.algodClient, 2),
    });

    const response = await claimSubscriptionAtc.execute(this.algodClient, 10);

    return {
      txId: response.txIDs.pop() as string,
    };
  }

  public async deleteSubscription({
    subscriber,
    subscriptionID,
  }: {
    subscriber: TransactionSignerAccount;
    subscriptionID: number;
  }): Promise<{
    txId: string;
  }> {
    const deleteSubscriptionAtc = new AtomicTransactionComposer();
    deleteSubscriptionAtc.addMethodCall({
      appID: this.appID,
      method: new ABIMethod({
        name: "delete_subscription",
        args: [
          {
            type: "asset",
            name: "subscription",
            desc: "The subscription ASA ID.",
          },
        ],
        returns: { type: "uint64" },
      }),
      methodArgs: [subscriptionID],
      boxes: [
        {
          appIndex: this.appID,
          name: decodeAddress(subscriber.addr).publicKey,
        },
      ],
      sender: subscriber.addr,
      signer: subscriber.signer,
      suggestedParams: await getParamsWithFeeCount(this.algodClient, 3),
    });

    const response = await deleteSubscriptionAtc.execute(this.algodClient, 10);

    return {
      txId: response.txIDs.pop() as string,
    };
  }

  public async getSubscription({
    algodClient,
    productID,
    subscriberAddress,
  }: {
    algodClient: AlgodClient;
    productID: number;
    subscriberAddress: string;
  }): Promise<SubscriptionRecord> {
    const getSubscriptionAtc = new AtomicTransactionComposer();
    getSubscriptionAtc.addMethodCall({
      appID: productID,
      method: new ABIMethod({
        name: "get_subscription",
        args: [
          {
            type: "address",
            name: "subscriber",
            desc: "The subscriber address.",
          },
        ],
        returns: { type: "uint64" },
      }),
      methodArgs: [subscriberAddress],
      sender: subscriberAddress,
      signer: this.creator.signer,
      suggestedParams: await getParamsWithFeeCount(algodClient, 1),
    });

    const response = await getSubscriptionAtc.simulate(algodClient);

    return response.methodResults[0].returnValue?.valueOf() as SubscriptionRecord;
  }
}
