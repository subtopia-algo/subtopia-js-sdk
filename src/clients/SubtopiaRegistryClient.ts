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
  decodeObj,
  EncodedSignedTransaction,
} from "algosdk";
import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";
import {
  normalizePrice,
  getParamsWithFeeCount,
  calculateSmiCreationMbr,
  calculateSmlCreationMbr,
  calculateRegistryLockerBoxCreateMbr,
  getLockerBoxPrefix,
} from "../utils";
import { getAssetByID } from "../utils";
import {
  PRODUCT_APPROVAL_KEY,
  PRODUCT_CLEAR_KEY,
  MIN_APP_OPTIN_MBR,
  MIN_APP_BALANCE_MBR,
  MIN_ASA_OPTIN_MBR,
  PRODUCT_CREATION_PLATFORM_FEE_CENTS,
  LOCKER_APPROVAL_KEY,
  LOCKER_CLEAR_KEY,
  SUBTOPIA_REGISTRY_ID,
} from "../constants";
import {
  SubscriptionType,
  PriceNormalizationType,
  ChainType,
  LockerType,
} from "../enums";

import {
  getAppById,
  getAppGlobalState,
} from "@algorandfoundation/algokit-utils";
import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";
import { ApplicationSpec } from "interfaces";

const STP_IMAGE_URL =
  "ipfs://bafybeicddz7kbuxajj6bob5bjqtweq6wchkdkiq4vvhwrwrne7iz4f25xi";
const STP_UNIT_NAME = "STP";
const encoder = new TextEncoder();

export class SubtopiaRegistryClient {
  algodClient: algosdk.Algodv2;
  creator: TransactionSignerAccount;
  version: string;
  appID: number;
  appAddress: string;
  appSpec: ApplicationSpec;
  oracleID: number;

  protected constructor({
    algodClient,
    creator,
    appID,
    appAddress,
    appSpec,
    oracleID,
    version,
  }: {
    algodClient: AlgodClient;
    creator: TransactionSignerAccount;
    appID: number;
    appAddress: string;
    appSpec: ApplicationSpec;
    oracleID: number;
    version: string;
  }) {
    this.algodClient = algodClient;
    this.creator = creator;
    this.appAddress = appAddress;
    this.appID = appID;
    this.appSpec = appSpec;
    this.oracleID = oracleID;
    this.version = version;
  }

  public static async init(
    algodClient: AlgodClient,
    creator: TransactionSignerAccount,
    chainType: ChainType
  ): Promise<SubtopiaRegistryClient> {
    const registryID = SUBTOPIA_REGISTRY_ID(chainType);
    const registryAddress = getApplicationAddress(registryID);
    const registrySpec = await getAppById(registryID, algodClient);

    const registryGlobalState = await getAppGlobalState(
      registryID,
      algodClient
    );
    const oracleID = registryGlobalState.oracle_id.value as number;

    const versionAtc = new AtomicTransactionComposer();
    versionAtc.addMethodCall({
      appID: registryID,
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
      txnGroups: [
        new modelsv2.SimulateRequestTransactionGroup({
          // Must decode the signed txn bytes into an object
          txns: group.map((txn) =>
            decodeObj(txn)
          ) as EncodedSignedTransaction[],
        }),
      ],
    });

    const response = await versionAtc.simulate(algodClient, request);
    const version = response.methodResults[0].returnValue as string;

    return new SubtopiaRegistryClient({
      algodClient: algodClient,
      creator: creator,
      appID: registryID,
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
      oracleID: oracleID,
      version: version,
    });
  }

  public async getProductCreationFee(coinID = 0): Promise<number> {
    return (
      algosToMicroalgos(MIN_APP_OPTIN_MBR) +
      algosToMicroalgos(MIN_APP_BALANCE_MBR) +
      (await calculateSmiCreationMbr(this.appSpec, 1, 8, 5)) +
      (coinID > 0 ? algosToMicroalgos(MIN_ASA_OPTIN_MBR) : 0)
    );
  }

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
      txnGroups: [
        new modelsv2.SimulateRequestTransactionGroup({
          // Must decode the signed txn bytes into an object
          txns: group.map((txn) =>
            decodeObj(txn)
          ) as EncodedSignedTransaction[],
        }),
      ],
    });

    const response = await computePlatformFeeAtc.simulate(
      this.algodClient,
      request
    );

    return Number(response.methodResults[0].returnValue);
  }

  public async getLockerCreationFee(creatorAddress: string): Promise<number> {
    return (
      algosToMicroalgos(MIN_APP_OPTIN_MBR) +
      (await calculateSmlCreationMbr(this.appSpec)) +
      calculateRegistryLockerBoxCreateMbr(creatorAddress)
    );
  }

  public async createLocker({
    creator,
    lockerType,
  }: {
    creator: TransactionSignerAccount;
    lockerType: LockerType;
  }): Promise<{
    txID: string;
    lockerID: number;
  }> {
    const feeAmount = (await this.getLockerCreationFee(creator.addr)) + 10000;

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
            from: creator.addr,
            to: this.appAddress,
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
            ...Buffer.from("cl-"),
            ...decodeAddress(creator.addr).publicKey,
          ]),
        },
        {
          appIndex: this.appID,
          name: encoder.encode(LOCKER_APPROVAL_KEY),
        },
        {
          appIndex: this.appID,
          name: encoder.encode(LOCKER_CLEAR_KEY),
        },
      ],
      sender: creator.addr,
      signer: creator.signer,
      suggestedParams: await getParamsWithFeeCount(this.algodClient, 4),
    });

    const response = await createLockerAtc.execute(this.algodClient, 10);

    return {
      txID: response.txIDs.pop() as string,
      lockerID: Number(response.methodResults[0].returnValue),
    };
  }

  public static async getLocker({
    registryID,
    algodClient,
    ownerAddress,
  }: {
    registryID: number;
    algodClient: AlgodClient;
    ownerAddress: string;
  }): Promise<number | undefined> {
    const boxValue = await algodClient
      .getApplicationBoxByName(
        registryID,
        new Uint8Array([
          ...getLockerBoxPrefix(LockerType.CREATOR),
          ...decodeAddress(ownerAddress).publicKey,
        ])
      )
      .do()
      .catch(() => undefined);

    return boxValue ? decodeUint64(boxValue.value, "safe") : undefined;
  }

  public async transferInfrastructure({
    infrastructureID,
    newOwnerAddress,
  }: {
    infrastructureID: number;
    newOwnerAddress: string;
  }): Promise<{
    txID: string;
  }> {
    const oldOwnerLockerId = await SubtopiaRegistryClient.getLocker({
      registryID: this.appID,
      algodClient: this.algodClient,
      ownerAddress: this.creator.addr,
    });
    const newOwnerLockerId = await SubtopiaRegistryClient.getLocker({
      registryID: this.appID,
      algodClient: this.algodClient,
      ownerAddress: newOwnerAddress,
    });

    if (!oldOwnerLockerId) {
      throw new Error("Locker not found");
    }

    const boxes = [
      {
        appIndex: this.appID,
        name: new Uint8Array([
          ...getLockerBoxPrefix(LockerType.CREATOR),
          ...decodeAddress(this.creator.addr).publicKey,
        ]),
      },
      {
        appIndex: this.appID,
        name: new Uint8Array([
          ...getLockerBoxPrefix(LockerType.CREATOR),
          ...decodeAddress(newOwnerAddress).publicKey,
        ]),
      },
    ];

    if (!newOwnerLockerId) {
      boxes.push.apply(boxes, [
        {
          appIndex: this.appID,
          name: encoder.encode(LOCKER_APPROVAL_KEY),
        },
        {
          appIndex: this.appID,
          name: encoder.encode(LOCKER_CLEAR_KEY),
        },
      ]);
    }

    const transferInfraAtc = new AtomicTransactionComposer();
    transferInfraAtc.addMethodCall({
      appID: this.appID,
      method: new ABIMethod({
        name: "transfer_infrastructure",
        args: [
          {
            type: "application",
            name: "infrastructure",
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
        infrastructureID,
        oldOwnerLockerId,
        newOwnerAddress,
        {
          txn: makePaymentTxnWithSuggestedParamsFromObject({
            from: this.creator.addr,
            to: this.appAddress,
            amount: algosToMicroalgos(newOwnerLockerId ? 1 : 0.5),
            suggestedParams: await getParamsWithFeeCount(this.algodClient, 0),
          }),
          signer: this.creator.signer,
        },
      ],
      boxes: boxes,
      sender: this.creator.addr,
      signer: this.creator.signer,
      appForeignApps: newOwnerLockerId ? [newOwnerLockerId] : undefined,
      suggestedParams: await getParamsWithFeeCount(
        this.algodClient,
        newOwnerLockerId ? 10 : 11
      ),
    });

    const response = await transferInfraAtc.execute(this.algodClient, 10);

    return {
      txID: response.txIDs.pop() as string,
    };
  }

  public async createInfrastructure({
    productName,
    subscriptionName,
    price,
    lockerID,
    subType = SubscriptionType.UNLIMITED,
    maxSubs = 0,
    coinID = 0,
    unitName = STP_UNIT_NAME,
    imageUrl = STP_IMAGE_URL,
    parseWholeUnits = false,
  }: {
    productName: string;
    subscriptionName: string;
    price: number;
    lockerID: number;
    subType?: SubscriptionType;
    maxSubs?: number;
    coinID?: number;
    unitName?: string;
    imageUrl?: string;
    parseWholeUnits?: boolean;
  }): Promise<{
    txID: string;
    infrastructureID: number;
  }> {
    const asset = await getAssetByID(this.algodClient, coinID);

    if (!this.oracleID) {
      throw new Error("SMR is not initialized");
    }
    const oracleAdminState = (
      await getAppGlobalState(this.oracleID, this.algodClient)
    ).admin;
    const adminAddress = encodeAddress(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      oracleAdminState.valueRaw
    );
    const feeAmount = await this.getProductCreationFee(coinID);
    const platformFeeAmount = await this.getProductCreationPlatformFee();

    const createInfraAtc = new AtomicTransactionComposer();
    createInfraAtc.addMethodCall({
      appID: this.appID,
      method: new ABIMethod({
        name: "create_infrastructure",
        args: [
          {
            type: "string",
            name: "product_name",
            desc: "The name of the product (subtopia, netflix, etc)",
          },
          {
            type: "string",
            name: "subscription_name",
            desc: "The subscription name of the product (pro, etc)",
          },
          {
            type: "uint64",
            name: "sub_type",
            desc: "The sub type of The product.",
          },
          {
            type: "uint64",
            name: "price",
            desc: "The price of The product.",
          },
          {
            type: "uint64",
            name: "max_subs",
            desc: "The maximum number of subscriptions.",
          },
          {
            type: "asset",
            name: "coin",
            desc: "The coin of The product.",
          },
          {
            type: "string",
            name: "unit_name",
            desc: "The unit name of The product.",
          },
          {
            type: "string",
            name: "image_url",
            desc: "The image URL of The product.",
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
        subscriptionName,
        subType.valueOf(),
        parseWholeUnits
          ? normalizePrice(
              price,
              asset.decimals,
              PriceNormalizationType.RAW
            ).valueOf()
          : price,
        maxSubs,
        asset.index,
        unitName,
        imageUrl,
        this.creator.addr,
        lockerID,
        this.oracleID,
        {
          txn: makePaymentTxnWithSuggestedParamsFromObject({
            from: this.creator.addr,
            to: this.appAddress,
            amount: feeAmount,
            suggestedParams: await getParamsWithFeeCount(this.algodClient, 0),
          }),
          signer: this.creator.signer,
        },
        {
          txn: makePaymentTxnWithSuggestedParamsFromObject({
            from: this.creator.addr,
            to: adminAddress,
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
            ...Buffer.from("cl-"),
            ...decodeAddress(this.creator.addr).publicKey,
          ]),
        },
        {
          appIndex: this.appID,
          name: encoder.encode(PRODUCT_APPROVAL_KEY),
        },
        {
          appIndex: this.appID,
          name: encoder.encode(PRODUCT_APPROVAL_KEY),
        },
        {
          appIndex: this.appID,
          name: encoder.encode(PRODUCT_APPROVAL_KEY),
        },
        {
          appIndex: this.appID,
          name: encoder.encode(PRODUCT_CLEAR_KEY),
        },
      ],
      sender: this.creator.addr,
      signer: this.creator.signer,
      suggestedParams: await getParamsWithFeeCount(
        this.algodClient,
        coinID > 0 ? 11 : 8
      ),
    });

    const response = await createInfraAtc.execute(this.algodClient, 10);

    return {
      txID: response.txIDs.pop() as string,
      infrastructureID: Number(response.methodResults[0].returnValue),
    };
  }

  public async deleteInfrastructure({
    infrastructureID,
    lockerID,
  }: {
    infrastructureID: number;
    lockerID: number;
  }): Promise<{
    txID: string;
  }> {
    const deleteInfraAtc = new AtomicTransactionComposer();
    deleteInfraAtc.addMethodCall({
      appID: this.appID,
      method: new ABIMethod({
        name: "delete_infrastructure",
        args: [
          {
            type: "application",
            name: "infrastructure",
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
      methodArgs: [infrastructureID, lockerID],
      boxes: [
        {
          appIndex: this.appID,
          name: new Uint8Array([
            ...Buffer.from("cl-"),
            ...decodeAddress(this.creator.addr).publicKey,
          ]),
        },
      ],
      sender: this.creator.addr,
      signer: this.creator.signer,
      suggestedParams: await getParamsWithFeeCount(this.algodClient, 4),
    });

    const response = await deleteInfraAtc.execute(this.algodClient, 10);

    return {
      txID: response.txIDs.pop() as string,
    };
  }
}
