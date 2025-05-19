// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

import algosdk, {
  algosToMicroalgos,
  decodeAddress,
  decodeUint64,
  encodeAddress,
  AtomicTransactionComposer,
  makePaymentTxnWithSuggestedParamsFromObject,
  ABIMethod,
  getApplicationAddress,
  makeEmptyTransactionSigner,
  modelsv2,
  msgpackRawDecode,
  Address,
} from "algosdk";
import {
  normalizePrice,
  getParamsWithFeeCount,
  calculateProductCreationMbr,
  calculateLockerCreationMbr,
  calculateRegistryLockerBoxCreateMbr,
  getLockerBoxPrefix,
  asyncWithTimeout,
  parseTokenProductGlobalState,
  encodeStringKey,
} from "../utils";
import { getAssetByID } from "../utils";
import {
  TOKEN_PRODUCT_APPROVAL_KEY,
  MIN_APP_OPTIN_MBR,
  MIN_ASA_OPTIN_MBR,
  PRODUCT_CREATION_PLATFORM_FEE_CENTS,
  LOCKER_APPROVAL_KEY,
  LOCKER_CLEAR_KEY,
  SUBTOPIA_REGISTRY_ID,
  MIN_APP_CREATE_MBR,
  DEFAULT_TXN_SIGN_TIMEOUT_SECONDS,
  TOKEN_PRODUCT_CLEAR_KEY,
  TOKEN_PRODUCT_VERSION_KEY,
  LOCKER_VERSION_KEY,
  LEGACY_PRODUCT_VERSION_KEY,
} from "../constants";
import {
  ProductType,
  PriceNormalizationType,
  LockerType,
  Duration,
} from "../types/enums";

import {
  getAppById,
  getAppGlobalState,
} from "@algorandfoundation/algokit-utils";
import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";
import { ApplicationSpec } from "types";
import {
  RegistryCreateLockerParams,
  RegistryCreateProductParams,
  RegistryDeleteProductParams,
  RegistryGetLockerParams,
  RegistryInitParams,
  RegistryTransferProductParams,
} from "types/registry";

const SUBTOPIA_DEFAULT_IMAGE_URL =
  "ipfs://bafybeicddz7kbuxajj6bob5bjqtweq6wchkdkiq4vvhwrwrne7iz4f25xi";
const SUBTOPIA_DEFAULT_UNIT_NAME = "STP";

/**
 * SubtopiaRegistryClient is a class that provides methods to interact with the Subtopia Registry contract.
 * It provides methods to create, update and delete products and lockers in the registry.
 */
export class SubtopiaRegistryClient {
  algodClient: algosdk.Algodv2;
  creator: TransactionSignerAccount;
  version: string;
  appID: number;
  appAddress: Address;
  appSpec: ApplicationSpec;
  oracleID: number;
  timeout: number;

  protected constructor({
    algodClient,
    creator,
    appID,
    appAddress,
    appSpec,
    oracleID,
    version,
    timeout,
  }: {
    algodClient: algosdk.Algodv2;
    creator: TransactionSignerAccount;
    appID: number;
    appAddress: Address;
    appSpec: ApplicationSpec;
    oracleID: number;
    version: string;
    timeout: number;
  }) {
    this.algodClient = algodClient;
    this.creator = creator;
    this.appAddress = appAddress;
    this.appID = appID;
    this.appSpec = appSpec;
    this.oracleID = oracleID;
    this.version = version;
    this.timeout = timeout;
  }

  /**
   * This method initializes a new instance of the SubtopiaRegistryClient class using the provided parameters.
   *
   * @param params - An object of type RegistryInitParams.
   * @returns A new instance of the SubtopiaRegistryClient class initialized with the provided parameters.
   * @example
   * ```typescript
   * import { ChainType, SubtopiaRegistryClient } from "subtopia-js-sdk";
   *
   * const registryClient = await SubtopiaRegistryClient.init({
   *    algodClient: algodClient,
   *    creator: creator,
   *    chainType: ChainType.TESTNET
   * });
   * ```
   */
  public static async init(
    params: RegistryInitParams,
  ): Promise<SubtopiaRegistryClient> {
    const {
      algodClient,
      creator,
      chainType,
      timeout = DEFAULT_TXN_SIGN_TIMEOUT_SECONDS,
      registryID,
    } = params;
    const registryId = registryID
      ? registryID
      : SUBTOPIA_REGISTRY_ID(chainType);
    const registryAddress = getApplicationAddress(registryId);
    const registrySpec = await getAppById(registryId, algodClient);

    const registryGlobalState = await getAppGlobalState(
      registryId,
      algodClient,
    );
    const oracleID = Number(registryGlobalState.oracle_id.value);

    const versionAtc = new AtomicTransactionComposer();
    versionAtc.addMethodCall({
      appID: registryId,
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

    return new SubtopiaRegistryClient({
      algodClient: algodClient,
      creator: creator,
      appID: registryId,
      appAddress: registryAddress,
      appSpec: {
        approval: registrySpec.params.approvalProgram,
        clear: registrySpec.params.clearStateProgram,
        globalNumUint:
          Number(registrySpec.params.globalStateSchema?.numUint) || 0,
        globalNumByteSlice:
          Number(registrySpec.params.globalStateSchema?.numByteSlice) || 0,
        localNumUint:
          Number(registrySpec.params.localStateSchema?.numUint) || 0,
        localNumByteSlice:
          Number(registrySpec.params.localStateSchema?.numByteSlice) || 0,
      },
      oracleID: Number(oracleID),
      version: version,
      timeout: timeout,
    });
  }

  /**
   * This method is used to get the latest available product contract version.
   * Can be used to check if the current product instance is up to date.
   * @returns {Promise<string>} A promise that resolves to the product version.
   */
  public async getProductVersion(productType: ProductType): Promise<string> {
    const appBoxResponse = await this.algodClient
      .getApplicationBoxByName(
        this.appID,
        new Uint8Array([
          ...Buffer.from(
            productType === ProductType.TOKEN_BASED
              ? TOKEN_PRODUCT_VERSION_KEY
              : LEGACY_PRODUCT_VERSION_KEY,
            "utf-8",
          ),
        ]),
      )
      .do();
    const version = new TextDecoder().decode(appBoxResponse.value);
    return version;
  }

  /**
   * This method is used to get the latest available locker contract version.
   * Can be used to check if the current locker instance is up to date.
   * @returns {Promise<string>} A promise that resolves to the locker version.
   */
  public async getLockerVersion(): Promise<string> {
    const appBoxResponse = await this.algodClient
      .getApplicationBoxByName(this.appID, encodeStringKey(LOCKER_VERSION_KEY))
      .do();
    const version = new TextDecoder().decode(appBoxResponse.value);
    return version;
  }

  /**
   * This method is used to calculate the product creation fee.
   * The fee is calculated based on the minimum balance requirements for creating and opting into an application,
   * and the minimum balance requirement for creating a product.
   * If a coinID is provided, the minimum balance requirement for opting into an ASA is also added to the fee.
   * @param {number} coinID - The ID of the coin. If provided, the minimum balance requirement for opting into an ASA is added to the fee.
   * @returns {Promise<number>} A promise that resolves to the product creation fee in microAlgos.
   */
  public async getProductCreationFee(coinID = 0): Promise<number> {
    return (
      algosToMicroalgos(MIN_APP_OPTIN_MBR) +
      algosToMicroalgos(MIN_APP_CREATE_MBR) +
      (await calculateProductCreationMbr(this.appSpec, 1, 9, 7)) +
      (coinID > 0 ? algosToMicroalgos(MIN_ASA_OPTIN_MBR) : 0)
    );
  }

  /**
   * This method is used to calculate the product creation platform fee.
   * The fee is always returns in microAlgos equivalent to the current price of Algo in cents.
   * @returns {Promise<number>} A promise that resolves to the product creation platform fee in microAlgos.
   */
  public async getProductCreationPlatformFee(): Promise<number> {
    const priceInCents = PRODUCT_CREATION_PLATFORM_FEE_CENTS;
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

    return Number(response.methodResults[0].returnValue);
  }

  /**
   * This method is used to calculate the locker creation fee.
   * The fee is calculated by adding the minimum application creation member,
   * the locker creation member, and the registry locker box creation member.
   * @param {string} creatorAddress - The address of the creator.
   * @returns {number} The locker creation fee.
   */
  public getLockerCreationFee(creatorAddress: Address): number {
    return (
      algosToMicroalgos(MIN_APP_CREATE_MBR) +
      calculateLockerCreationMbr() +
      calculateRegistryLockerBoxCreateMbr(creatorAddress)
    );
  }

  /**
   * This method is used to calculate the locker transfer fee.
   * The fee is calculated by adding the minimum application opt-in member,
   * and if the coinID is provided, the minimum ASA opt-in member.
   * If the locker is new, the locker creation fee is also added.
   * @param {string} creatorAddress - The address of the creator.
   * @param {boolean} isNewLocker - Whether the locker is new.
   * @param {number} coinID - The ID of the coin.
   * @returns {number} The locker transfer fee.
   */
  public getLockerTransferFee(
    creatorAddress: Address,
    isNewLocker: boolean,
    coinID: number,
  ): number {
    let fee = algosToMicroalgos(MIN_APP_OPTIN_MBR);
    fee = coinID ? fee + algosToMicroalgos(MIN_ASA_OPTIN_MBR) : fee;
    return isNewLocker ? fee + this.getLockerCreationFee(creatorAddress) : fee;
  }

  /**
   * This method is used to create a new locker.
   * The locker creation fee is calculated and paid by the creator.
   * The method returns the transaction ID and the locker ID.
   * @param {RegistryCreateLockerParams} params - An object containing the parameters for locker creation.
   * @returns {Promise<{txID: string, lockerID: number}>} A promise that resolves to an object containing the transaction ID and the locker ID.
   */
  public async createLocker(params: RegistryCreateLockerParams): Promise<{
    txID: string;
    lockerID: number;
  }> {
    const { creator, lockerType } = params;
    const feeAmount = this.getLockerCreationFee(creator.addr);

    const createLockerAtc = new AtomicTransactionComposer();
    createLockerAtc.addMethodCall({
      appID: this.appID,
      method: new ABIMethod({
        name: "create_locker",
        args: [
          {
            name: "manager",
            type: "address",
          },
          {
            name: "locker_type",
            type: "uint64",
          },
          {
            name: "fee_txn",
            type: "pay",
          },
        ],
        returns: { type: "uint64" },
      }),
      methodArgs: [
        creator.addr,
        lockerType.valueOf(),
        {
          txn: makePaymentTxnWithSuggestedParamsFromObject({
            sender: creator.addr,
            receiver: this.appAddress,
            amount: feeAmount,
            suggestedParams: await getParamsWithFeeCount(this.algodClient, 0),
          }),
          signer: creator.signer,
        },
      ],
      boxes: [
        {
          appIndex: this.appID,
          name: new Uint8Array([
            ...getLockerBoxPrefix(lockerType),
            ...creator.addr.publicKey,
          ]),
        },
        {
          appIndex: this.appID,
          name: encodeStringKey(LOCKER_APPROVAL_KEY),
        },
        {
          appIndex: this.appID,
          name: encodeStringKey(LOCKER_CLEAR_KEY),
        },
      ],
      sender: creator.addr,
      signer: creator.signer,
      suggestedParams: await getParamsWithFeeCount(this.algodClient, 4),
    });

    const response = await asyncWithTimeout(
      createLockerAtc.execute.bind(createLockerAtc),
      this.timeout,
      this.algodClient,
      10,
    );

    return {
      txID: response.txIDs.pop() as string,
      lockerID: Number(response.methodResults[0].returnValue),
    };
  }

  public static async getLocker({
    registryID,
    algodClient,
    ownerAddress,
    lockerType,
  }: RegistryGetLockerParams): Promise<number | null> {
    const boxValue = await algodClient
      .getApplicationBoxByName(
        registryID,
        new Uint8Array([
          ...getLockerBoxPrefix(lockerType),
          ...decodeAddress(String(ownerAddress)).publicKey,
        ]),
      )
      .do()
      .catch(() => null);

    return boxValue ? decodeUint64(boxValue.value, "safe") : null;
  }

  /**
   * This method is used to transfer a product from one owner to another.
   * The method returns the transaction ID of the transfer.
   * @param {RegistryTransferProductParams} params - An object containing the parameters for product transfer.
   * @returns {Promise<{txID: string}>} A promise that resolves to an object containing the transaction ID.
   */
  public async transferProduct(params: RegistryTransferProductParams): Promise<{
    txID: string;
  }> {
    const { productID, newOwnerAddress } = params;
    const oldOwnerLockerID = await SubtopiaRegistryClient.getLocker({
      registryID: this.appID,
      algodClient: this.algodClient,
      ownerAddress: this.creator.addr,
      lockerType: LockerType.CREATOR,
    });
    const newOwnerLockerID = await SubtopiaRegistryClient.getLocker({
      registryID: this.appID,
      algodClient: this.algodClient,
      ownerAddress: newOwnerAddress,
      lockerType: LockerType.CREATOR,
    });

    if (!oldOwnerLockerID) {
      throw new Error("Locker not found");
    }

    const boxes = [
      {
        appIndex: this.appID,
        name: new Uint8Array([
          ...getLockerBoxPrefix(LockerType.CREATOR),
          ...this.creator.addr.publicKey,
        ]),
      },
      {
        appIndex: this.appID,
        name: new Uint8Array([
          ...getLockerBoxPrefix(LockerType.CREATOR),
          ...decodeAddress(String(newOwnerAddress)).publicKey,
        ]),
      },
    ];

    if (!newOwnerLockerID) {
      boxes.push.apply(boxes, [
        {
          appIndex: this.appID,
          name: encodeStringKey(LOCKER_APPROVAL_KEY),
        },
        {
          appIndex: this.appID,
          name: encodeStringKey(LOCKER_CLEAR_KEY),
        },
      ]);
    }

    const rawProductState = await getAppGlobalState(
      productID,
      this.algodClient,
    );
    const productState = parseTokenProductGlobalState(rawProductState);

    const productCoinID = productState.coin_id as number;
    const appCallFee =
      (newOwnerLockerID ? 10 : 11) + (productCoinID > 0 ? 3 : 0);
    const payFee = this.getLockerTransferFee(
      newOwnerAddress,
      !newOwnerLockerID,
      productCoinID,
    );
    const transferInfraAtc = new AtomicTransactionComposer();
    transferInfraAtc.addMethodCall({
      appID: this.appID,
      method: new ABIMethod({
        name: "transfer_product",
        args: [
          {
            type: "application",
            name: "product",
            desc: "The product.",
          },
          {
            type: "application",
            name: "old_locker",
            desc: "The old locker.",
          },
          {
            type: "address",
            name: "new_manager",
            desc: "The new manager address.",
          },
          {
            type: "pay",
            name: "transfer_fee_txn",
            desc: "The transfer fee transaction.",
          },
        ],
        returns: { type: "void" },
      }),
      methodArgs: [
        productID,
        oldOwnerLockerID,
        newOwnerAddress,
        {
          txn: makePaymentTxnWithSuggestedParamsFromObject({
            sender: this.creator.addr,
            receiver: this.appAddress,
            amount: payFee,
            suggestedParams: await getParamsWithFeeCount(this.algodClient, 0),
          }),
          signer: this.creator.signer,
        },
      ],
      boxes: boxes,
      sender: this.creator.addr,
      signer: this.creator.signer,
      appForeignAssets: productCoinID ? [productCoinID] : undefined,
      appForeignApps: newOwnerLockerID ? [newOwnerLockerID] : undefined,
      suggestedParams: await getParamsWithFeeCount(
        this.algodClient,
        appCallFee,
      ),
    });

    const response = await asyncWithTimeout(
      transferInfraAtc.execute.bind(transferInfraAtc),
      this.timeout,
      this.algodClient,
      10,
    );

    return {
      txID: response.txIDs.pop() as string,
    };
  }

  /**
   * This method is used to create a new product.
   * The method returns the transaction ID and the product ID.
   * @param {RegistryCreateProductParams} params - An object containing the parameters for product creation.
   * @returns {Promise<{txID: string, productID: number}>} A promise that resolves to an object containing the transaction ID and the product ID.
   */
  public async createProduct(params: RegistryCreateProductParams): Promise<{
    txID: string;
    productID: number;
  }> {
    const {
      productName,
      productType,
      subscriptionName,
      price,
      lockerID,
      maxSubs = 0,
      coinID = 0,
      duration = Duration.UNLIMITED,
      unitName = SUBTOPIA_DEFAULT_UNIT_NAME,
      imageUrl = SUBTOPIA_DEFAULT_IMAGE_URL,
      parseWholeUnits = false,
    } = params;
    const asset = await getAssetByID(this.algodClient, coinID);

    if (!this.oracleID) {
      throw new Error("'RegistryClient' is not initialized");
    }
    const oracleAdminState = (
      await getAppGlobalState(this.oracleID, this.algodClient)
    ).admin;
    const adminAddress = encodeAddress(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      oracleAdminState.valueRaw,
    );
    const feeAmount = await this.getProductCreationFee(coinID);
    const platformFeeAmount = await this.getProductCreationPlatformFee();

    const createInfraAtc = new AtomicTransactionComposer();
    createInfraAtc.addMethodCall({
      appID: this.appID,
      method: new ABIMethod({
        name: "create_product",
        args: [
          {
            type: "string",
            name: "product_name",
            desc: "The name of the product (subtopia, netflix, etc)",
          },
          {
            type: "uint64",
            name: "product_type",
            desc: "The type of the Product.",
          },
          {
            type: "string",
            name: "subscription_name",
            desc: "The subscription name of the product (pro, etc)",
          },
          {
            type: "uint64",
            name: "price",
            desc: "The price of the Product.",
          },
          {
            type: "uint64",
            name: "max_subs",
            desc: "The maximum number of subscriptions.",
          },
          {
            type: "asset",
            name: "coin",
            desc: "The coin of the Product.",
          },
          {
            type: "string",
            name: "unit_name",
            desc: "The unit name of the Product.",
          },
          {
            type: "string",
            name: "image_url",
            desc: "The image URL of the Product.",
          },
          {
            type: "uint64",
            name: "duration",
          },
          {
            type: "address",
            name: "manager",
            desc: "The manager address.",
          },
          {
            type: "application",
            name: "locker",
            desc: "The locker.",
          },
          {
            type: "application",
            name: "oracle",
            desc: "The oracle.",
          },
          {
            type: "pay",
            name: "fee_txn",
            desc: "The fee transaction.",
          },
          {
            type: "pay",
            name: "platform_fee_txn",
            desc: "The platform fee transaction.",
          },
        ],
        returns: { type: "uint64" },
      }),
      methodArgs: [
        productName,
        productType,
        subscriptionName,
        parseWholeUnits
          ? normalizePrice(
              price,
              asset.decimals,
              PriceNormalizationType.RAW,
            ).valueOf()
          : price,
        maxSubs,
        asset.index,
        unitName,
        imageUrl,
        duration,
        this.creator.addr,
        lockerID,
        this.oracleID,
        {
          txn: makePaymentTxnWithSuggestedParamsFromObject({
            sender: this.creator.addr,
            receiver: this.appAddress,
            amount: feeAmount,
            suggestedParams: await getParamsWithFeeCount(this.algodClient, 0),
          }),
          signer: this.creator.signer,
        },
        {
          txn: makePaymentTxnWithSuggestedParamsFromObject({
            sender: this.creator.addr,
            receiver: adminAddress,
            amount: platformFeeAmount,
            suggestedParams: await getParamsWithFeeCount(this.algodClient, 0),
          }),
          signer: this.creator.signer,
        },
      ],
      boxes: [
        {
          appIndex: this.appID,
          name: new Uint8Array([
            ...Buffer.from("cl-", "utf-8"),
            ...this.creator.addr.publicKey,
          ]),
        },
        {
          appIndex: this.appID,
          name: encodeStringKey(TOKEN_PRODUCT_APPROVAL_KEY),
        },
        {
          appIndex: this.appID,
          name: encodeStringKey(TOKEN_PRODUCT_APPROVAL_KEY),
        },
        {
          appIndex: this.appID,
          name: encodeStringKey(TOKEN_PRODUCT_APPROVAL_KEY),
        },
        {
          appIndex: this.appID,
          name: encodeStringKey(TOKEN_PRODUCT_CLEAR_KEY),
        },
      ],
      sender: this.creator.addr,
      signer: this.creator.signer,
      suggestedParams: await getParamsWithFeeCount(
        this.algodClient,
        coinID > 0 ? 11 : 8,
      ),
    });

    const response = await asyncWithTimeout(
      createInfraAtc.execute.bind(createInfraAtc),
      this.timeout,
      this.algodClient,
      10,
    );

    return {
      txID: response.txIDs.pop() as string,
      productID: Number(response.methodResults[0].returnValue),
    };
  }

  /**
   * This method is used to delete a product.
   * The method returns the transaction ID.
   * @param {RegistryDeleteProductParams} params - An object containing the parameters for product deletion.
   * @returns {Promise<{txID: string}>} A promise that resolves to an object containing the transaction ID.
   */
  public async deleteProduct(params: RegistryDeleteProductParams): Promise<{
    txID: string;
  }> {
    const { productID, lockerID } = params;
    const deleteInfraAtc = new AtomicTransactionComposer();
    deleteInfraAtc.addMethodCall({
      appID: this.appID,
      method: new ABIMethod({
        name: "delete_product",
        args: [
          {
            type: "application",
            name: "product",
            desc: "The product.",
          },
          {
            type: "application",
            name: "locker",
            desc: "The locker.",
          },
        ],
        returns: { type: "void" },
      }),
      methodArgs: [productID, lockerID],
      boxes: [
        {
          appIndex: this.appID,
          name: new Uint8Array([
            ...Buffer.from("cl-", "utf-8"),
            ...this.creator.addr.publicKey,
          ]),
        },
      ],
      sender: this.creator.addr,
      signer: this.creator.signer,
      suggestedParams: await getParamsWithFeeCount(this.algodClient, 4),
    });

    const response = await asyncWithTimeout(
      deleteInfraAtc.execute.bind(deleteInfraAtc),
      this.timeout,
      this.algodClient,
      10,
    );

    return {
      txID: response.txIDs.pop() as string,
    };
  }
}
