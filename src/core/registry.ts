/**
 * Registry operations for Subtopia SDK
 */
import { RegistryClient } from "../clients/typed/Registry";
import { OracleClient } from "../clients/typed/Oracle";
import {
  SubtopiaConfig,
  CreateProductParams,
  CreateProductResult,
  LockerInfo,
  BaseResult,
} from "./types";
import {
  SUBTOPIA_REGISTRY_ID,
  SUBTOPIA_DEFAULT_IMAGE_URL,
  SUBTOPIA_DEFAULT_UNIT_NAME,
  MIN_APP_CREATE_MBR,
  MIN_ASA_OPTIN_MBR,
  MIN_APP_OPTIN_MBR,
  PRODUCT_CREATION_PLATFORM_FEE_CENTS,
  ChainType,
  LockerType,
  ProductType,
} from "./constants";
import {
  calculateBoxMbr,
  calculateContractCreationMbr,
  getAssetByID,
} from "./internal/utils";
import { AlgoAmount } from "@algorandfoundation/algokit-utils/types/amount";
import algosdk, { ABIUintType } from "algosdk";
import { algo } from "@algorandfoundation/algokit-utils";
import { APP_SPEC as TOKEN_BASED_PRODUCT_APP_SPEC } from "../clients/typed/TokenBasedProduct";
import { APP_SPEC as LOCKER_APP_SPEC } from "../clients/typed/Locker";

/**
 * Get or create a registry client
 */
async function getRegistryClient(
  config: SubtopiaConfig,
): Promise<RegistryClient> {
  const registryId =
    config.registryId ??
    BigInt(SUBTOPIA_REGISTRY_ID(config.chainType ?? ChainType.MAINNET));

  return config.algorand.client.getTypedAppClientById(RegistryClient, {
    appId: registryId,
    defaultSender: config.defaultSender,
    defaultSigner: config.defaultSigner,
  });
}

/**
 * Get locker for a creator
 */
export async function getLocker(
  config: SubtopiaConfig,
  creator: string,
  lockerType: LockerType = LockerType.CREATOR,
): Promise<bigint | null> {
  const registry = await getRegistryClient(config);

  try {
    const result = await registry.getLocker({
      args: {
        manager: creator,
        lockerType: BigInt(lockerType),
      },
    });

    return result ?? null;
  } catch {
    return null;
  }
}

/**
 * Create a locker for a creator
 */
export async function createLocker(
  config: SubtopiaConfig,
  creator: string,
  lockerType: LockerType = LockerType.CREATOR,
): Promise<LockerInfo> {
  const registry = await getRegistryClient(config);

  // Calculate fee
  const fee = await calculateLockerFee(config, creator);

  const result = await registry.send.createLocker({
    args: {
      manager: creator,
      lockerType: BigInt(lockerType),
      feeTxn: await config.algorand.createTransaction.payment({
        sender: creator,
        receiver: registry.appAddress,
        amount: AlgoAmount.MicroAlgos(fee),
      }),
    },
    coverAppCallInnerTransactionFees: true,
    maxFee: AlgoAmount.MicroAlgos(10_000),
    sender: creator,
  });

  return {
    id: result.return!,
    owner: creator,
    type: lockerType,
  };
}

/**
 * Get or create a locker for a creator
 */
export async function getOrCreateLocker(
  config: SubtopiaConfig,
  creator: string,
  lockerType: LockerType = LockerType.CREATOR,
): Promise<LockerInfo> {
  const existingLocker = await getLocker(config, creator, lockerType);

  if (existingLocker !== null && existingLocker > 0n) {
    return {
      id: existingLocker,
      owner: creator,
      type: lockerType,
    };
  }

  return createLocker(config, creator, lockerType);
}

/**
 * Create a new product
 */
export async function createProduct(
  config: SubtopiaConfig,
  params: CreateProductParams & { creator: string },
): Promise<CreateProductResult> {
  const registry = await getRegistryClient(config);

  // Get or create locker
  const locker = await getOrCreateLocker(config, params.creator);

  // Get oracle ID from registry state
  const oracleId = await registry.state.global.oracleId();
  if (!oracleId) {
    throw new Error("Oracle ID not found in registry");
  }

  // Get asset info
  const asset = await getAssetByID(
    config.algorand.client.algod,
    Number(params.coinId ?? 0),
  );

  // Calculate fees
  const creationFee = await calculateProductCreationFee(
    config,
    params.coinId ?? 0n,
  );
  const platformFee = await calculatePlatformFee(config, oracleId);

  // Get oracle admin for platform fee
  const oracleClient = new OracleClient({
    algorand: config.algorand,
    appId: oracleId,
  });
  const oracleAdminState = (
    await oracleClient.state.global.admin()
  ).asByteArray();
  let oracleAdmin = params.creator;
  if (oracleAdminState !== undefined) {
    oracleAdmin = algosdk.encodeAddress(oracleAdminState) ?? params.creator;
  }

  const result = await registry.send.createProduct({
    args: {
      productName: params.name,
      productType: BigInt(ProductType.TOKEN_BASED),
      subscriptionName: params.subscriptionName,
      price: params.price,
      maxSubs: params.maxSubscriptions ?? 0n,
      coin: BigInt(asset.index),
      unitName: params.unitName ?? SUBTOPIA_DEFAULT_UNIT_NAME,
      imageUrl: params.imageUrl ?? SUBTOPIA_DEFAULT_IMAGE_URL,
      duration: params.duration ?? 0n,
      manager: params.creator,
      locker: locker.id,
      oracle: oracleId,
      feeTxn: await config.algorand.createTransaction.payment({
        sender: params.creator,
        receiver: registry.appAddress,
        amount: AlgoAmount.MicroAlgos(creationFee),
        staticFee: AlgoAmount.MicroAlgos(1000),
      }),
      platformFeeTxn: await config.algorand.createTransaction.payment({
        sender: params.creator,
        receiver: oracleAdmin,
        amount: AlgoAmount.MicroAlgos(platformFee),
        staticFee: AlgoAmount.MicroAlgos(1000),
      }),
    },
    coverAppCallInnerTransactionFees: true,
    staticFee: AlgoAmount.Algos(0.1),
    sender: params.creator,
  });

  return {
    txId: result.txIds[0],
    confirmedRound: result.confirmations?.[0]?.confirmedRound
      ? BigInt(result.confirmations[0].confirmedRound)
      : 0n,
    productId: result.return!,
  };
}

/**
 * Transfer a product to a new owner
 */
export async function transferProduct(
  config: SubtopiaConfig,
  params: {
    productId: bigint;
    currentOwner: string;
    newOwner: string;
  },
): Promise<BaseResult> {
  const registry = await getRegistryClient(config);

  // Get old owner's locker
  const oldLocker = await getOrCreateLocker(config, params.currentOwner);

  // Check if new owner has a locker
  const existingNewLocker = await getLocker(config, params.newOwner);
  const isNewLocker = existingNewLocker === null || existingNewLocker === 0n;

  // Calculate transfer fee (includes locker creation if needed)
  const transferFee = await calculateTransferFee(
    config,
    params.newOwner,
    params.productId,
    isNewLocker,
  );

  const result = await registry.send.transferProduct({
    args: {
      product: params.productId,
      oldLocker: oldLocker.id,
      newManager: params.newOwner,
      transferFeeTxn: await config.algorand.createTransaction.payment({
        sender: params.currentOwner, // Current owner pays for new locker if needed
        receiver: registry.appAddress,
        amount: AlgoAmount.MicroAlgos(transferFee),
      }),
    },
    sender: params.currentOwner,
    maxFee: AlgoAmount.MicroAlgos(100_000n),
    coverAppCallInnerTransactionFees: true,
  });

  return {
    txId: result.txIds[0],
    confirmedRound: result.confirmations?.[0]?.confirmedRound
      ? BigInt(result.confirmations[0].confirmedRound)
      : 0n,
  };
}

/**
 * Delete a product
 */
export async function deleteProduct(
  config: SubtopiaConfig,
  params: {
    productId: bigint;
    owner: string;
  },
): Promise<BaseResult> {
  const registry = await getRegistryClient(config);
  const locker = await getOrCreateLocker(config, params.owner);

  const result = await registry.send.deleteProduct({
    args: {
      product: params.productId,
      locker: locker.id,
    },
    sender: params.owner,
    maxFee: AlgoAmount.MicroAlgos(100_000n),
    coverAppCallInnerTransactionFees: true,
  });

  return {
    txId: result.txIds[0],
    confirmedRound: result.confirmations?.[0]?.confirmedRound
      ? BigInt(result.confirmations[0].confirmedRound)
      : 0n,
  };
}

/**
 * Get latest product version
 */
export async function getProductVersion(
  config: SubtopiaConfig,
  productType: ProductType = ProductType.TOKEN_BASED,
): Promise<string> {
  const registry = await getRegistryClient(config);
  const result = await registry.getProductVersion({
    args: {
      productType: BigInt(productType),
    },
  });

  return result!;
}

/**
 * Get latest locker version
 */
export async function getLockerVersion(
  config: SubtopiaConfig,
): Promise<string> {
  const registry = await getRegistryClient(config);
  const appBoxResponse = await config.algorand.client.algod
    .getApplicationBoxByName(
      registry.appId,
      new Uint8Array(Buffer.from("locker_version", "utf-8")),
    )
    .do();
  const version = new TextDecoder().decode(appBoxResponse.value);
  return version;
}

// Fee calculation helpers
async function calculateLockerFee(
  _config: SubtopiaConfig,
  _creator: string,
): Promise<bigint> {
  // TODO: Use config and creator for dynamic fee calculation
  void _config;
  void _creator;

  // Base MBR for app creation
  const baseFee = AlgoAmount.Algos(MIN_APP_CREATE_MBR).microAlgos;

  // Add box storage MBR - simplified for now
  const boxFee = await calculateContractCreationMbr(
    LOCKER_APP_SPEC,
    _config.algorand,
  );

  const uint64Type = new ABIUintType(64);
  const lockerCreationBoxFee = calculateBoxMbr(
    new Uint8Array(35), // cl- plus address
    uint64Type.byteLen(), // UInt64 is 8 bytes - 800 is microalgos
    "create",
  );

  return baseFee + boxFee + lockerCreationBoxFee;
}

async function calculateProductCreationFee(
  config: SubtopiaConfig,
  coinId: bigint,
): Promise<bigint> {
  return (
    algo(MIN_APP_OPTIN_MBR).microAlgo +
    algo(MIN_APP_CREATE_MBR).microAlgo +
    (await calculateContractCreationMbr(
      TOKEN_BASED_PRODUCT_APP_SPEC,
      config.algorand,
    )) +
    (coinId > 0 ? algo(MIN_ASA_OPTIN_MBR).microAlgo : 0n)
  );
}

async function calculatePlatformFee(
  config: SubtopiaConfig,
  oracleId: bigint,
): Promise<bigint> {
  // Use oracle to convert USD cents to microAlgos
  const oracleClient = new OracleClient({
    algorand: config.algorand,
    appId: oracleId,
    defaultSender: config.defaultSender,
  });

  try {
    const result = await oracleClient.computePlatformFee({
      args: {
        wholeUsd: BigInt(PRODUCT_CREATION_PLATFORM_FEE_CENTS),
      },
    });

    return result;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error("Failed to calculate platform fee", { cause: error });
    } else {
      throw new Error("Failed to calculate platform fee: Unknown error");
    }
  }
}

async function calculateTransferFee(
  config: SubtopiaConfig,
  newOwner: string,
  productId: bigint,
  isNewLocker: boolean,
): Promise<bigint> {
  // These will be used in full implementation to check:
  // - if product uses non-ALGO asset (using config and productId)
  void config;
  void productId;

  // Base opt-in fee for the product
  const optinFee = AlgoAmount.Algos(MIN_APP_OPTIN_MBR).microAlgos;

  // Check if product uses non-ALGO asset (would need to fetch product state)
  // For now, assume worst case with ASA opt-in
  const asaOptinFee = AlgoAmount.Algos(MIN_ASA_OPTIN_MBR).microAlgos;

  // If new locker needs to be created, add locker creation fee
  const lockerCreationFee = isNewLocker
    ? await calculateLockerFee(config, newOwner)
    : 0n;

  return optinFee + asaOptinFee + lockerCreationFee;
}
