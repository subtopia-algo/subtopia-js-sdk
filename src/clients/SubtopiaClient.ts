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
  calculateProductDiscountBoxCreateMbr,
  calculateProductSubscriptionBoxCreateMbr,
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
  DurationType,
  DiscountType,
  Duration,
  SubscriptionType,
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
  DiscountRecord,
  ProductState,
  SubscriptionRecord,
} from "interfaces";

export class SubtopiaClient {
  productName: string;
  subscriptionName: string;
  algodClient: algosdk.Algodv2;
  creator: TransactionSignerAccount;
  price: number;
  coin: AssetMetadata;
  oracleID: number;
  version: string;
  appID: number;
  appAddress: string;
  appSpec: ApplicationSpec;

  protected constructor({
    algodClient,
    productName,
    subscriptionName,
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
    productName: string;
    subscriptionName: string;
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
    this.productName = productName;
    this.subscriptionName = subscriptionName;
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
    const productName = String(productGlobalState.product_name.value);
    const subscriptionName = String(productGlobalState.subscription_name.value);

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
      productName: productName,
      subscriptionName: subscriptionName,
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

  public async getAppState(
    withPriceNormalization = true
  ): Promise<ProductState> {
    const globalState = await getAppGlobalState(
      this.appID,
      this.algodClient
    ).catch((error) => {
      throw new Error(error);
    });

    const durations = [];
    if (Number(globalState.sub_type.value) === SubscriptionType.UNLIMITED) {
      durations.push(Duration.UNLIMITED);
    } else {
      durations.push(
        Duration.MONTH,
        Duration.QUARTER,
        Duration.SEMI_ANNUAL,
        Duration.ANNUAL
      );
    }

    const discounts = [];
    for (const duration of durations) {
      try {
        const discount = await this.getDiscount({ duration });
        discounts.push(discount);
      } catch (error) {
        // Ignore
        continue;
      }
    }

    return {
      productName: String(globalState.product_name.value),
      subscriptionName: String(globalState.subscription_name.value),
      manager: encodeAddress(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        globalState.manager.valueRaw
      ),
      price: withPriceNormalization
        ? normalizePrice(
            Number(globalState.price.value),
            this.coin.decimals,
            PriceNormalizationType.RAW
          )
        : Number(globalState.price.value),
      totalSubs: Number(globalState.total_subs.value),
      maxSubs: Number(globalState.max_subs.value),
      coinID: Number(globalState.coin_id.value),
      subType: Number(globalState.sub_type.value),
      lifecycle: Number(globalState.lifecycle.value),
      createdAt: Number(globalState.created_at.value),
      oracleID: Number(globalState.oracle_id.value),
      unitName: String(globalState.unit_name.value),
      imageURL: String(globalState.image_url.value),
      discounts: discounts,
    };
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
    duration,
  }: {
    duration: Duration;
  }): Promise<DiscountRecord> {
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
        returns: { type: "(uint64,uint64,uint64,uint64,uint64,uint64)" },
      }),
      methodArgs: [duration.valueOf()],
      boxes: [
        {
          appIndex: this.appID,
          name: encodeUint64(duration.valueOf()),
        },
      ],
      sender: this.creator.addr,
      signer: this.creator.signer,
      suggestedParams: await getParamsWithFeeCount(this.algodClient, 1),
    });

    const response = await getDiscountAtc.simulate(this.algodClient);
    const rawContent = response.methodResults[0].returnValue?.valueOf();

    const boxContent: Array<number> = Array.isArray(rawContent)
      ? rawContent.map((value) => Number(value))
      : [];

    if (boxContent.length !== 6) {
      throw new Error("Invalid subscription record");
    }

    return {
      duration: boxContent[0],
      discountType: boxContent[1],
      discountValue: boxContent[2],
      expiresAt: boxContent[3] === 0 ? undefined : new Date(boxContent[3]),
      createdAt: new Date(boxContent[4]),
      totalClaims: boxContent[5],
    };
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
    txID: string;
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
            amount: calculateProductDiscountBoxCreateMbr(),
            suggestedParams: await getParamsWithFeeCount(this.algodClient, 0),
          }),
          signer: this.creator.signer,
        },
      ],
      boxes: [
        {
          appIndex: this.appID,
          name: encodeUint64(duration.valueOf()),
        },
      ],
      sender: this.creator.addr,
      signer: this.creator.signer,
      suggestedParams: await getParamsWithFeeCount(this.algodClient, 2),
    });

    const response = await createDiscountAtc.execute(this.algodClient, 10);

    return {
      txID: response.txIDs.pop() as string,
    };
  }

  public async deleteDiscount({
    duration,
  }: {
    duration: DurationType;
  }): Promise<{
    txID: string;
  }> {
    const deleteDiscountAtc = new AtomicTransactionComposer();
    deleteDiscountAtc.addMethodCall({
      appID: this.appID,
      method: new ABIMethod({
        name: "delete_discount",
        args: [
          {
            type: "uint64",
            name: "duration",
            desc: "The duration of the discount.",
          },
        ],
        returns: { type: "void" },
      }),
      methodArgs: [duration.valueOf()],
      boxes: [
        {
          appIndex: this.appID,
          name: encodeUint64(duration.valueOf()),
        },
      ],
      sender: this.creator.addr,
      signer: this.creator.signer,
      suggestedParams: await getParamsWithFeeCount(this.algodClient, 2),
    });

    const response = await deleteDiscountAtc.execute(this.algodClient, 10);

    return {
      txID: response.txIDs.pop() as string,
    };
  }

  public async createSubscription({
    subscriber,
    duration,
  }: {
    subscriber: TransactionSignerAccount;
    duration: DurationType;
  }): Promise<{
    txID: string;
    subscriptionID: number;
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
        duration.valueOf(),
        creatorLockerId,
        this.oracleID,
        {
          txn: makePaymentTxnWithSuggestedParamsFromObject({
            from: subscriber.addr,
            to: this.appAddress,
            amount:
              calculateProductSubscriptionBoxCreateMbr(subscriber.addr) +
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
          name: encodeUint64(duration.valueOf()),
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
      txID: response.txIDs.pop() as string,
      subscriptionID: Number(response.methodResults[0].returnValue),
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
    txID: string;
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
      txID: response.txIDs.pop() as string,
    };
  }

  public async claimSubscription({
    subscriber,
    subscriptionID,
  }: {
    subscriber: TransactionSignerAccount;
    subscriptionID: number;
  }): Promise<{
    txID: string;
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
      txID: response.txIDs.pop() as string,
    };
  }

  public async deleteSubscription({
    subscriber,
    subscriptionID,
  }: {
    subscriber: TransactionSignerAccount;
    subscriptionID: number;
  }): Promise<{
    txID: string;
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
      txID: response.txIDs.pop() as string,
    };
  }

  public async isSubscriber({
    subscriberAddress,
  }: {
    subscriberAddress: string;
  }): Promise<boolean> {
    const isSubscriberAtc = new AtomicTransactionComposer();
    isSubscriberAtc.addMethodCall({
      appID: this.appID,
      method: new ABIMethod({
        name: "is_subscriber",
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
      sender: this.creator.addr,
      signer: this.creator.signer,
      boxes: [
        {
          appIndex: this.appID,
          name: decodeAddress(subscriberAddress).publicKey,
        },
      ],
      suggestedParams: await getParamsWithFeeCount(this.algodClient, 1),
    });

    const response = await isSubscriberAtc.simulate(this.algodClient);

    return Boolean(response.methodResults[0].returnValue);
  }

  public async getSubscription({
    algodClient,
    subscriberAddress,
  }: {
    algodClient: AlgodClient;
    subscriberAddress: string;
  }): Promise<SubscriptionRecord> {
    const getSubscriptionAtc = new AtomicTransactionComposer();
    getSubscriptionAtc.addMethodCall({
      appID: this.appID,
      method: new ABIMethod({
        name: "get_subscription",
        args: [
          {
            type: "address",
            name: "subscriber",
            desc: "The subscriber address.",
          },
        ],
        returns: { type: "(uint64,uint64,uint64,uint64,uint64)" },
      }),
      methodArgs: [subscriberAddress],
      sender: this.creator.addr,
      signer: this.creator.signer,
      boxes: [
        {
          appIndex: this.appID,
          name: decodeAddress(subscriberAddress).publicKey,
        },
      ],
      suggestedParams: await getParamsWithFeeCount(algodClient, 1),
    });

    const response = await getSubscriptionAtc.simulate(algodClient);
    const boxContent: Array<number> = (
      response.methodResults[0].returnValue?.valueOf() as Array<number>
    ).map((value) => Number(value));

    if (boxContent.length !== 5) {
      throw new Error("Invalid subscription record");
    }

    return {
      subType: boxContent[0],
      subID: boxContent[1],
      createdAt: new Date(boxContent[2]),
      expiresAt: boxContent[3] === 0 ? undefined : new Date(boxContent[3]),
      duration: boxContent[4],
    };
  }
}
