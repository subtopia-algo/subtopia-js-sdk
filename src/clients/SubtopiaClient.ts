// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

import algosdk, {
  ABIMethod,
  Address,
  AtomicTransactionComposer,
  algosToMicroalgos,
  encodeAddress,
  getApplicationAddress,
  makeAssetTransferTxnWithSuggestedParamsFromObject,
  makeEmptyTransactionSigner,
  makePaymentTxnWithSuggestedParamsFromObject,
  modelsv2,
  msgpackRawDecode,
} from "algosdk";
import {
  normalizePrice,
  getParamsWithFeeCount,
  calculateLockerCreationMbr,
  calculateRegistryLockerBoxCreateMbr,
  calculateProductDiscountBoxCreateMbr,
  calculateProductSubscriptionBoxCreateMbr,
  optInAsset,
  asyncWithTimeout,
  parseTokenProductGlobalState,
} from "../utils";
import { getAssetByID } from "../utils";
import {
  SUBSCRIPTION_PLATFORM_FEE_CENTS,
  MIN_APP_CREATE_MBR,
  MIN_ASA_CREATE_MBR,
  DEFAULT_TXN_SIGN_TIMEOUT_SECONDS,
  SUBTOPIA_REGISTRY_ID,
  ENCODED_DISCOUNT_BOX_KEY,
} from "../constants";

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
  DiscountType,
  LifecycleState,
  LockerType,
  PriceNormalizationType,
  ProductDiscountCreationParams,
  ProductInitParams,
  ProductLifecycleStateUpdate,
  ProductState,
  ProductSubscriberCheckParams,
  ProductSubscriptionClaimParams,
  ProductSubscriptionCreationParams,
  ProductSubscriptionDeletionParams,
  ProductSubscriptionRetrievalParams,
  ProductSubscriptionTransferParams,
  SubscriberRecord,
  SubscriptionRecord,
} from "../types";

/**
 * The `SubtopiaClient` class is responsible for interacting with a Subtopia Product contracts on the Algorand blockchain.
 * It provides methods for initializing the client, managing the lifecycle of the application, creating and managing subscriptions,
 * and retrieving information about the application and subscriptions.
 */
export class SubtopiaClient {
  productName: string;
  subscriptionName: string;
  algodClient: algosdk.Algodv2;
  creator: TransactionSignerAccount;
  price: bigint;
  coin: AssetMetadata;
  oracleID: bigint;
  version: string;
  appID: bigint;
  appAddress: Address;
  appSpec: ApplicationSpec;
  timeout: number;
  registryID: bigint;

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
    timeout,
    registryID,
  }: {
    algodClient: algosdk.Algodv2;
    productName: string;
    subscriptionName: string;
    creator: TransactionSignerAccount;
    appSpec: ApplicationSpec;
    appID: bigint;
    appAddress: Address;
    oracleID: bigint;
    price: bigint;
    coin: AssetMetadata;
    version: string;
    timeout: number;
    registryID: bigint;
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
    this.timeout = timeout;
    this.registryID = registryID;
  }

  /**
   * Initializes a SubtopiaClient instance.
   * Retrieves the product's global state, validates it, and creates a new SubtopiaClient.
   *
   * @param {ProductInitParams} params - The parameters for initializing the client.
   *
   * @returns {Promise<SubtopiaClient>} Promise resolving to a SubtopiaClient instance.
   *
   * @example
   * ```typescript
   * import { SubtopiaClient } from "@algorand/subtopia";
   *
   * const subtopiaClient = await SubtopiaClient.init({
   *   algodClient: algodClient,
   *   productID: productID,
   *   creator: creator
   * });
   * ```
   */
  public static async init(params: ProductInitParams): Promise<SubtopiaClient> {
    const {
      algodClient,
      chainType,
      registryID,
      productID,
      creator,
      timeout = DEFAULT_TXN_SIGN_TIMEOUT_SECONDS,
    } = params;
    const registryId = registryID
      ? registryID
      : SUBTOPIA_REGISTRY_ID(chainType);

    const rawProductGlobalState = await getAppGlobalState(
      productID,
      algodClient,
    ).catch((error) => {
      throw new Error(error);
    });
    const productGlobalState = parseTokenProductGlobalState(
      rawProductGlobalState,
    );

    if (!productGlobalState.oracle_id) {
      throw new Error("Oracle missing, cannot initialize");
    }

    const oracleID = BigInt(productGlobalState.oracle_id);
    const productAddress = getApplicationAddress(productID);
    const productPrice = BigInt(productGlobalState.price);
    const productSpec = await getAppById(productID, algodClient);
    const productName = productGlobalState.product_name;
    const subscriptionName = productGlobalState.subscription_name;

    const versionAtc = new AtomicTransactionComposer();

    versionAtc.addMethodCall({
      appID: productID,
      method: new ABIMethod({
        name: "get_version",
        args: [],
        returns: { type: "string" },
      }),
      sender: creator.addr,
      signer: makeEmptyTransactionSigner(),
      suggestedParams: await getParamsWithFeeCount(algodClient, 1),
    });

    const group = versionAtc
      .buildGroup()
      .map((txn) => algosdk.encodeUnsignedSimulateTransaction(txn.txn));

    const request = new modelsv2.SimulateRequest({
      allowEmptySignatures: true,
      allowMoreLogging: true,
      txnGroups: [
        new modelsv2.SimulateRequestTransactionGroup({
          // Must decode the signed txn bytes into an object
          txns: group.map((txn) =>
            msgpackRawDecode(txn),
          ) as algosdk.SignedTransaction[],
        }),
      ],
    });

    const response = await versionAtc.simulate(algodClient, request);
    const version = response.methodResults[0].returnValue as string;
    const coin = await getAssetByID(algodClient, productGlobalState.coin_id);

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
        globalNumUint: productSpec.params.globalStateSchema?.numUint || 0,
        globalNumByteSlice:
          productSpec.params.globalStateSchema?.numByteSlice || 0,
        localNumUint: productSpec.params.localStateSchema?.numUint || 0,
        localNumByteSlice:
          productSpec.params.localStateSchema?.numByteSlice || 0,
      },
      oracleID,
      price: productPrice,
      coin,
      version,
      timeout,
      registryID: BigInt(registryId),
    });
  }

  /**
   * This method is used to update the lifecycle state of the application.
   * The method returns the transaction ID.
   * @param {ProductLifecycleStateUpdate} params - The parameters for updating the lifecycle state.
   * @returns {Promise<{txID: string}>} A promise that resolves to an object containing the transaction ID.
   */
  protected async updateLifecycle(
    params: ProductLifecycleStateUpdate,
  ): Promise<{
    txID: string;
  }> {
    const { lifecycle } = params;
    const updateLifecycleAtc = new AtomicTransactionComposer();
    updateLifecycleAtc.addMethodCall({
      appID: this.appID,
      method: new ABIMethod({
        name: "update_lifecycle",
        args: [
          {
            type: "uint64",
            name: "lifecycle",
            desc: "The new lifecycle.",
          },
        ],
        returns: { type: "void" },
      }),
      methodArgs: [lifecycle],
      sender: this.creator.addr,
      signer: this.creator.signer,
      suggestedParams: await getParamsWithFeeCount(this.algodClient, 1),
    });

    const response = await asyncWithTimeout(
      updateLifecycleAtc.execute.bind(updateLifecycleAtc),
      this.timeout,
      this.algodClient,
      10,
    );

    return {
      txID: response.txIDs.pop() as string,
    };
  }

  /**
   * This method is used to enable the application (updates the lifecycle).
   * The method returns the transaction ID.
   * @returns {Promise<{txID: string}>} A promise that resolves to an object containing the transaction ID.
   */
  public async enable(): Promise<{
    txID: string;
  }> {
    return this.updateLifecycle({ lifecycle: LifecycleState.ENABLED });
  }

  /**
   * This method is utilized to deactivate the application by updating the lifecycle.
   * It should be invoked prior to the deletion of the application. Once deactivated, the product will cease to allow
   * new subscriptions to be purchased, and existing subscribers will only have the option to cancel their subscriptions.
   * The product can be deleted once all subscriptions have been cancelled or have expired.
   * The method returns the transaction ID.
   * @returns {Promise<{txID: string}>} A promise that resolves to an object containing the transaction ID.
   */
  public async disable(): Promise<{
    txID: string;
  }> {
    return this.updateLifecycle({ lifecycle: LifecycleState.DISABLED });
  }

  /**
   * Retrieves the current state of the application.
   * Returns an object containing various details about the product such as product name, subscription name, manager, price, total subscriptions, maximum subscriptions, coin ID, subscription type, lifecycle, creation time, oracle ID, unit name, image URL, and discount.
   * @param {boolean} parseWholeUnits - Specifies whether to parse the whole units (default is true).
   * @returns {Promise<ProductState>} A promise that resolves to an object representing the current state of the application.
   */
  public async getAppState(parseWholeUnits = true): Promise<ProductState> {
    const rawGlobalState = await getAppGlobalState(
      this.appID,
      this.algodClient,
    ).catch((error) => {
      throw new Error(error);
    });
    const globalState = parseTokenProductGlobalState(rawGlobalState);

    const discount = await this.getDiscount();

    return {
      productName: String(globalState.product_name),
      subscriptionName: String(globalState.subscription_name),
      manager: globalState.manager,
      price: parseWholeUnits
        ? normalizePrice(
            BigInt(globalState.price),
            this.coin.decimals,
            PriceNormalizationType.PRETTY,
          )
        : BigInt(globalState.price),
      totalSubs: BigInt(globalState.total_subscribers),
      maxSubs: BigInt(globalState.max_subscribers),
      coinID: BigInt(globalState.coin_id),
      productType: globalState.product_type,
      lifecycle: BigInt(globalState.lifecycle),
      createdAt: BigInt(globalState.created_at),
      duration: globalState.duration,
      oracleID: BigInt(globalState.oracle_id),
      unitName: String(globalState.unit_name),
      imageURL: String(globalState.image_url),
      discount: discount,
    };
  }

  /**
   * This method calculates the platform fee for a subscription.
   * It returns the platform fee as a bigint.
   * @returns {Promise<bigint>} A promise that resolves to the platform fee.
   */
  public async getSubscriptionPlatformFee(): Promise<bigint> {
    if (this.price === 0n) {
      return new Promise((resolve) => resolve(0n));
    }

    const priceInCents = SUBSCRIPTION_PLATFORM_FEE_CENTS;
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
      signer: makeEmptyTransactionSigner(),
      suggestedParams: await getParamsWithFeeCount(this.algodClient, 1),
    });

    const group = computePlatformFeeAtc
      .buildGroup()
      .map((txn) => algosdk.encodeUnsignedSimulateTransaction(txn.txn));

    const request = new modelsv2.SimulateRequest({
      allowEmptySignatures: true,
      allowMoreLogging: true,
      txnGroups: [
        new modelsv2.SimulateRequestTransactionGroup({
          // Must decode the signed txn bytes into an object
          txns: group.map((txn) =>
            msgpackRawDecode(txn),
          ) as algosdk.SignedTransaction[],
        }),
      ],
    });

    const response = await computePlatformFeeAtc.simulate(
      this.algodClient,
      request,
    );

    return BigInt(response.methodResults[0].returnValue as string);
  }

  /**
   * This method calculates the locker creation fee.
   * It requires the creator's address as an input and returns a promise that resolves to the calculated fee amount.
   * @param {string} creatorAddress - The address of the locker's creator.
   * @returns {Promise<number>} A promise that resolves to the calculated locker creation fee.
   */
  public async getLockerCreationFee(creatorAddress: Address): Promise<number> {
    return (
      algosToMicroalgos(MIN_APP_CREATE_MBR) +
      calculateLockerCreationMbr() +
      calculateRegistryLockerBoxCreateMbr(creatorAddress)
    );
  }

  /**
   * This method retrieves the discount based on a given duration.
   * It accepts a duration object as an argument and returns a promise that resolves to a DiscountRecord.
   * @returns {Promise<DiscountRecord>} A promise that resolves to the discount record.
   */
  public async getDiscount(): Promise<DiscountRecord | undefined> {
    const getDiscountAtc = new AtomicTransactionComposer();
    getDiscountAtc.addMethodCall({
      appID: this.appID,
      method: new ABIMethod({
        name: "get_discount",
        args: [],
        returns: {
          type: "(uint64,uint64,uint64,uint64,uint64)",
          desc: "An expression that returns the discount.",
        },
        desc: "Returns the discount if exists.",
      }),
      methodArgs: [],
      boxes: [
        {
          appIndex: this.appID,
          name: ENCODED_DISCOUNT_BOX_KEY,
        },
      ],
      sender: this.creator.addr,
      signer: makeEmptyTransactionSigner(),
      suggestedParams: await getParamsWithFeeCount(this.algodClient, 1),
    });

    const group = getDiscountAtc
      .buildGroup()
      .map((txn) => algosdk.encodeUnsignedSimulateTransaction(txn.txn));

    const request = new modelsv2.SimulateRequest({
      allowEmptySignatures: true,
      allowMoreLogging: true,
      txnGroups: [
        new modelsv2.SimulateRequestTransactionGroup({
          // Must decode the signed txn bytes into an object
          txns: group.map((txn) =>
            msgpackRawDecode(txn),
          ) as algosdk.SignedTransaction[],
        }),
      ],
    });

    const response = await getDiscountAtc.simulate(this.algodClient, request);
    const rawContent = response.methodResults[0].returnValue?.valueOf();

    if (!rawContent) {
      return undefined;
    }

    const boxContent: Array<bigint> = Array.isArray(rawContent)
      ? rawContent.map((value) => BigInt(value))
      : [];

    if (boxContent.length !== 5) {
      throw new Error("Invalid subscription record");
    }

    return {
      discountType: Number(boxContent[0]),
      discountValue: boxContent[1],
      expiresAt: boxContent[2] === 0n ? null : boxContent[2],
      createdAt: boxContent[3],
      totalClaims: boxContent[4],
    };
  }

  /**
   * This function creates a discount for a subscription and returns the transaction ID.
   * @param {ProductDiscountCreationParams} params - The parameters for creating a discount.
   * @returns {Promise<{txID: string}>} A promise that resolves to an object containing the transaction ID.
   */
  public async createDiscount(params: ProductDiscountCreationParams): Promise<{
    txID: string;
  }> {
    const {
      discountType,
      discountValue,
      expiresIn,
      parseWholeUnits = false,
    } = params;
    const createDiscountAtc = new AtomicTransactionComposer();
    createDiscountAtc.addMethodCall({
      appID: this.appID,
      method: new ABIMethod({
        name: "create_discount",
        args: [
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
        discountType.valueOf(),
        parseWholeUnits
          ? normalizePrice(
              discountValue,
              this.coin.decimals,
              PriceNormalizationType.RAW,
            )
          : discountValue,
        expiresIn,
        {
          txn: makePaymentTxnWithSuggestedParamsFromObject({
            sender: this.creator.addr,
            receiver: this.appAddress,
            amount: calculateProductDiscountBoxCreateMbr(),
            suggestedParams: await getParamsWithFeeCount(this.algodClient, 0),
          }),
          signer: this.creator.signer,
        },
      ],
      boxes: [
        {
          appIndex: this.appID,
          name: ENCODED_DISCOUNT_BOX_KEY,
        },
      ],
      sender: this.creator.addr,
      signer: this.creator.signer,
      suggestedParams: await getParamsWithFeeCount(this.algodClient, 2),
    });

    const response = await asyncWithTimeout(
      createDiscountAtc.execute.bind(createDiscountAtc),
      this.timeout,
      this.algodClient,
      10,
    );

    return {
      txID: response.txIDs.pop() as string,
    };
  }

  /**
   * This method is used to delete a discount.
   * Removes active discount from a product contract if exists.
   * @returns {Promise<{txID: string}>} A promise that resolves to an object containing the transaction ID.
   */
  public async deleteDiscount(): Promise<{
    txID: string;
  }> {
    const deleteDiscountAtc = new AtomicTransactionComposer();
    deleteDiscountAtc.addMethodCall({
      appID: this.appID,
      method: new ABIMethod({
        name: "delete_discount",
        args: [],
        returns: { type: "void" },
      }),
      methodArgs: [],
      boxes: [
        {
          appIndex: this.appID,
          name: ENCODED_DISCOUNT_BOX_KEY,
        },
      ],
      sender: this.creator.addr,
      signer: this.creator.signer,
      suggestedParams: await getParamsWithFeeCount(this.algodClient, 2),
    });

    const response = await asyncWithTimeout(
      deleteDiscountAtc.execute.bind(deleteDiscountAtc),
      this.timeout,
      this.algodClient,
      10,
    );

    return {
      txID: response.txIDs.pop() as string,
    };
  }

  /**
   * This method is utilized to initiate a subscription.
   * It accepts a subscriber as an argument and returns a promise that resolves to an object containing the transaction ID and subscription ID.
   * @param {ProductSubscriptionCreationParams} params - The parameters for creating a subscription.
   * @returns {Promise<{txID: string, subscriptionID: bigint}>} A promise that resolves to an object containing the transaction ID and subscription ID.
   */
  public async createSubscription(
    params: ProductSubscriptionCreationParams,
  ): Promise<{
    txID: string;
    subscriptionID: bigint;
  }> {
    const { subscriber } = params;
    const oracleAdminState = (
      await getAppGlobalState(this.oracleID, this.algodClient)
    ).admin;
    const adminAddress = encodeAddress(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      oracleAdminState.valueRaw,
    );
    const platformFeeAmount = await this.getSubscriptionPlatformFee();
    const state = await this.getAppState(false);
    const managerLockerID = await SubtopiaRegistryClient.getLocker({
      registryID: this.registryID,
      algodClient: this.algodClient,
      ownerAddress: state.manager,
      lockerType: LockerType.CREATOR,
    });

    if (!managerLockerID) {
      throw new Error("Creator locker is not initialized");
    }

    const lockerAddress = getApplicationAddress(managerLockerID);

    let subscriptionPrice = this.price;
    if (state.discount) {
      if (state.discount.discountType === DiscountType.PERCENTAGE) {
        subscriptionPrice =
          subscriptionPrice -
          (subscriptionPrice * state.discount.discountValue) / 100n;
      } else if (state.discount.discountType === DiscountType.FIXED) {
        subscriptionPrice = subscriptionPrice - state.discount.discountValue;
      }
    }

    const currentSubscription = await this.getSubscription({
      algodClient: this.algodClient,
      subscriberAddress: subscriber.addr,
    }).catch(() => {
      return null;
    });
    const isHoldingSubscription = currentSubscription !== null;
    const isActiveSubscriber = await this.isSubscriber({
      subscriberAddress: subscriber.addr,
    });
    const isHoldingExpiredSubscription =
      isHoldingSubscription && !isActiveSubscriber;

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
        managerLockerID,
        this.oracleID,
        {
          txn: makePaymentTxnWithSuggestedParamsFromObject({
            sender: subscriber.addr,
            receiver: this.appAddress,
            amount: isHoldingExpiredSubscription
              ? 0
              : calculateProductSubscriptionBoxCreateMbr(subscriber.addr) +
                algosToMicroalgos(MIN_ASA_CREATE_MBR),
            suggestedParams: await getParamsWithFeeCount(this.algodClient, 0),
          }),
          signer: subscriber.signer,
        },
        {
          txn: makePaymentTxnWithSuggestedParamsFromObject({
            sender: subscriber.addr,
            receiver: adminAddress,
            amount: this.price > 0 ? platformFeeAmount : 0,
            suggestedParams: await getParamsWithFeeCount(this.algodClient, 0),
          }),
          signer: subscriber.signer,
        },
        this.coin.index === 0n
          ? {
              txn: makePaymentTxnWithSuggestedParamsFromObject({
                sender: subscriber.addr,
                receiver: lockerAddress,
                amount: subscriptionPrice,
                suggestedParams: await getParamsWithFeeCount(
                  this.algodClient,
                  0,
                ),
              }),
              signer: subscriber.signer,
            }
          : {
              txn: makeAssetTransferTxnWithSuggestedParamsFromObject({
                sender: subscriber.addr,
                receiver: lockerAddress,
                amount: subscriptionPrice,
                assetIndex: this.coin.index,
                suggestedParams: await getParamsWithFeeCount(
                  this.algodClient,
                  0,
                ),
              }),
              signer: subscriber.signer,
            },
      ],
      boxes: [
        {
          appIndex: this.appID,
          name: subscriber.addr.publicKey,
        },
        {
          appIndex: this.appID,
          name: ENCODED_DISCOUNT_BOX_KEY,
        },
      ],
      sender: subscriber.addr,
      signer: subscriber.signer,
      suggestedParams: await getParamsWithFeeCount(
        this.algodClient,
        this.coin.index > 0 ? 6 : 5,
      ),
    });

    const response = await asyncWithTimeout(
      createSubscriptionAtc.execute.bind(createSubscriptionAtc),
      this.timeout,
      this.algodClient,
      10,
    ).catch((error) => {
      throw new Error(error);
    });

    return {
      txID: response.txIDs.pop() as string,
      subscriptionID: BigInt(response.methodResults[0].returnValue as string),
    };
  }

  /**
   * Transfers a subscription from one subscriber to another.
   *
   * @param {ProductSubscriptionTransferParams} params - The parameters for transferring a subscription.
   *
   * @returns {Promise<{txID: string}>} A promise that resolves to an object containing the transaction ID of the transfer operation.
   */
  public async transferSubscription(
    params: ProductSubscriptionTransferParams,
  ): Promise<{
    txID: string;
  }> {
    const { oldSubscriber, newSubscriberAddress, subscriptionID } = params;
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
          name: oldSubscriber.addr.publicKey,
        },
        {
          appIndex: this.appID,
          name: newSubscriberAddress.publicKey,
        },
      ],
      methodArgs: [newSubscriberAddress, subscriptionID],
      sender: oldSubscriber.addr,
      signer: oldSubscriber.signer,
      suggestedParams: await getParamsWithFeeCount(this.algodClient, 2),
    });

    const response = await asyncWithTimeout(
      transferSubscriptionAtc.execute.bind(transferSubscriptionAtc),
      this.timeout,
      this.algodClient,
      10,
    );

    return {
      txID: response.txIDs.pop() as string,
    };
  }

  /**
   * Claims a subscription for a given subscriber.
   *
   * @param {ProductSubscriptionClaimParams} params - The parameters for claiming a subscription.
   * @returns {Promise<Object>} - The transaction ID of the executed transaction.
   */
  public async claimSubscription(
    params: ProductSubscriptionClaimParams,
  ): Promise<{
    txID: string;
  }> {
    const { subscriber, subscriptionID } = params;
    const assetInfo = await this.algodClient
      .accountAssetInformation(subscriber.addr, subscriptionID)
      .do()
      .catch(() => {
        return null;
      });

    if (!assetInfo) {
      await optInAsset({
        client: this.algodClient,
        account: subscriber,
        assetID: subscriptionID,
      });
    }

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
          name: subscriber.addr.publicKey,
        },
      ],
      sender: subscriber.addr,
      signer: subscriber.signer,
      suggestedParams: await getParamsWithFeeCount(this.algodClient, 2),
    });

    const response = await asyncWithTimeout(
      claimSubscriptionAtc.execute.bind(claimSubscriptionAtc),
      this.timeout,
      this.algodClient,
      10,
    );

    return {
      txID: response.txIDs.pop() as string,
    };
  }

  /**
   * @param {ProductSubscriptionDeletionParams} params - The parameters for deleting a subscription.
   * @returns {Promise<{txID: string}>} A promise that resolves to an object containing the transaction ID.
   */
  public async deleteSubscription(
    params: ProductSubscriptionDeletionParams,
  ): Promise<{
    txID: string;
  }> {
    const { subscriber, subscriptionID } = params;
    let isHoldingSubscription = false;
    const assetInfo = await this.algodClient
      .accountAssetInformation(subscriber.addr, subscriptionID)
      .do()
      .catch(() => {
        isHoldingSubscription = false;
      });
    if (assetInfo && assetInfo.assetHolding) {
      isHoldingSubscription = assetInfo.assetHolding.amount > 0;
    }

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
          name: subscriber.addr.publicKey,
        },
      ],
      sender: subscriber.addr,
      signer: subscriber.signer,
      suggestedParams: await getParamsWithFeeCount(
        this.algodClient,
        isHoldingSubscription ? 4 : 3,
      ),
    });

    const response = await asyncWithTimeout(
      deleteSubscriptionAtc.execute.bind(deleteSubscriptionAtc),
      this.timeout,
      this.algodClient,
      10,
    );

    return {
      txID: response.txIDs.pop() as string,
    };
  }

  /**
   * Checks if a given address is a subscriber.
   *
   * @param {ProductSubscriberCheckParams} params - The parameters for checking if an address is a subscriber.
   * @returns {Promise<boolean>} - A promise that resolves to a boolean indicating whether the address is a subscriber.
   */
  public async isSubscriber(
    params: ProductSubscriberCheckParams,
  ): Promise<boolean> {
    const { subscriberAddress } = params;
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
      signer: makeEmptyTransactionSigner(),
      boxes: [
        {
          appIndex: this.appID,
          name: subscriberAddress.publicKey,
        },
      ],
      suggestedParams: await getParamsWithFeeCount(this.algodClient, 1),
    });

    const group = isSubscriberAtc
      .buildGroup()
      .map((txn) => algosdk.encodeUnsignedSimulateTransaction(txn.txn));

    const request = new modelsv2.SimulateRequest({
      allowEmptySignatures: true,
      allowMoreLogging: true,
      txnGroups: [
        new modelsv2.SimulateRequestTransactionGroup({
          // Must decode the signed txn bytes into an object
          txns: group.map((txn) =>
            msgpackRawDecode(txn),
          ) as algosdk.SignedTransaction[],
        }),
      ],
    });

    const response = await isSubscriberAtc.simulate(this.algodClient, request);

    return Boolean(response.methodResults[0].returnValue);
  }

  /**
   * This method is used to get a subscription.
   * It takes an AlgodClient and a subscriber address as arguments and returns a promise that resolves to a SubscriptionRecord.
   * @param {ProductSubscriptionRetrievalParams} params - The parameters for retrieving a subscription.
   * @returns {Promise<SubscriptionRecord>} A promise that resolves to a SubscriptionRecord.
   */
  public async getSubscription(
    params: ProductSubscriptionRetrievalParams,
  ): Promise<SubscriptionRecord> {
    const { algodClient, subscriberAddress } = params;
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
      signer: makeEmptyTransactionSigner(),
      boxes: [
        {
          appIndex: this.appID,
          name: subscriberAddress.publicKey,
        },
      ],
      suggestedParams: await getParamsWithFeeCount(algodClient, 1),
    });

    const group = getSubscriptionAtc
      .buildGroup()
      .map((txn) => algosdk.encodeUnsignedSimulateTransaction(txn.txn));

    const request = new modelsv2.SimulateRequest({
      allowEmptySignatures: true,
      allowMoreLogging: true,
      txnGroups: [
        new modelsv2.SimulateRequestTransactionGroup({
          // Must decode the signed txn bytes into an object
          txns: group.map((txn) =>
            msgpackRawDecode(txn),
          ) as algosdk.SignedTransaction[],
        }),
      ],
    });

    const response = await getSubscriptionAtc.simulate(algodClient, request);
    const boxContent: Array<bigint> = (
      response.methodResults[0].returnValue?.valueOf() as Array<bigint>
    ).map((value) => BigInt(value));

    if (boxContent.length !== 5) {
      throw new Error("Invalid subscription record");
    }

    return {
      subscriptionID: boxContent[0],
      productType: Number(boxContent[1]),
      createdAt: boxContent[2],
      expiresAt: boxContent[3] === 0n ? null : boxContent[3],
      duration: Number(boxContent[4]),
    };
  }

  public async getSubscribers({ filterExpired = false } = {}): Promise<
    Array<SubscriberRecord>
  > {
    const subscriberBoxes = await this.algodClient
      .getApplicationBoxes(this.appID)
      .do();

    const promises = subscriberBoxes.boxes.map(async (box) => {
      const address = Address.fromString(encodeAddress(box.name));
      const subscription = this.getSubscription({
        algodClient: this.algodClient,
        subscriberAddress: address,
      });
      return {
        address: address,
        subscription: await subscription,
      };
    });

    const results = await Promise.allSettled(promises);

    const subscriberRecords: Array<SubscriberRecord> = results
      .filter((result) => result.status === "fulfilled")
      .map(
        (result) => (result as PromiseFulfilledResult<SubscriberRecord>).value,
      );

    const rejectedPromises = results
      .filter((result) => result.status === "rejected")
      .map((result) => (result as PromiseRejectedResult).reason);

    if (rejectedPromises.length > 0) {
      throw new Error(`Errors occurred: ${rejectedPromises.join(", ")}`);
    }

    return filterExpired
      ? subscriberRecords.filter((record) => {
          return (
            record.subscription.expiresAt === null ||
            record.subscription.expiresAt > BigInt(Date.now() / 1000)
          );
        })
      : subscriberRecords;
  }
}
