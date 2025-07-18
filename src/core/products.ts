/**
 * Product operations for Subtopia SDK
 */
import { TokenBasedProductClient } from "../clients/typed/TokenBasedProduct";
import { OracleClient } from "../clients/typed/Oracle";
import {
  SubtopiaConfig,
  SubscribeParams,
  SubscribeResult,
  BaseResult,
  ProductState,
  SubscriptionState,
  DiscountState,
} from "./types";
import { getLocker } from "./registry";
import {
  SUBSCRIPTION_PLATFORM_FEE_CENTS,
  MIN_ASA_CREATE_MBR,
  LockerType,
  DiscountType,
  LifecycleState,
  ADDRESS_BYTE_LENGTH,
} from "./constants";
import { AlgoAmount } from "@algorandfoundation/algokit-utils/types/amount";
import algosdk, { ABIUintType, getApplicationAddress } from "algosdk";
import { calculateBoxMbr } from "./internal/utils";

/**
 * Get a product client
 */
async function getProductClient(
  config: SubtopiaConfig,
  productId: bigint,
): Promise<TokenBasedProductClient> {
  return new TokenBasedProductClient({
    algorand: config.algorand,
    appId: productId,
    defaultSender: config.defaultSender,
    defaultSigner: config.defaultSigner,
  });
}

/**
 * Get product state
 */
export async function getProductState(
  config: SubtopiaConfig,
  productId: bigint,
): Promise<ProductState> {
  try {
    const client = await getProductClient(config, productId);
    const state = await client.state.global.getAll();

    // Get discount if exists
    const discount = await getProductDiscount(config, productId);

    return {
      id: productId,
      name: state.productName?.asString() ?? "",
      subscriptionName: state.subscriptionName?.asString() ?? "",
      manager:
        algosdk.encodeAddress(
          state.manager?.asByteArray() ?? new Uint8Array(),
        ) ?? "",
      price: state.price ?? 0n,
      coinId: state.coinId ?? 0n,
      totalSubscribers: state.totalSubscribers ?? 0n,
      maxSubscribers: state.maxSubscribers ?? 0n,
      duration: state.duration ?? 0n,
      lifecycle: Number(state.lifecycle ?? 0n),
      createdAt: state.createdAt ?? 0n,
      oracleId: state.oracleId ?? 0n,
      unitName: state.unitName?.asString() ?? "",
      imageUrl: state.imageUrl?.asString() ?? "",
      discount,
    };
  } catch (error) {
    console.error(`Failed to get product state for ${productId}:`, error);
    throw new Error(
      `Unable to fetch product state: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get product discount
 */
export async function getProductDiscount(
  config: SubtopiaConfig,
  productId: bigint,
): Promise<DiscountState | undefined> {
  const client = await getProductClient(config, productId);

  try {
    const result = await client.getDiscount();
    if (!result) return undefined;

    return {
      type: Number(result.discountType),
      value: result.discountValue,
      expiresAt: result.expiresAt === 0n ? null : result.expiresAt,
      createdAt: result.createdAt,
      totalClaims: result.totalClaims,
    };
  } catch {
    // Handle simulation errors gracefully - discount might not be initialized
    // Return undefined for any error as discount is optional
    return undefined;
  }
}

/**
 * Subscribe to a product
 */
export async function subscribe(
  config: SubtopiaConfig,
  params: SubscribeParams,
): Promise<SubscribeResult> {
  const client = await getProductClient(config, params.productId);
  const state = await getProductState(config, params.productId);

  // Check if product is enabled
  if (state.lifecycle !== LifecycleState.ENABLED) {
    throw new Error("Product is not enabled");
  }

  // Check if creator has a locker
  const creatorLocker = await getLocker(
    config,
    state.manager,
    LockerType.CREATOR,
  );
  if (!creatorLocker || creatorLocker === 0n) {
    throw new Error("Creator locker is not initialized");
  }

  // Calculate subscription price with discount
  let subscriptionPrice = state.price;
  if (state.discount) {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const isExpired =
      state.discount.expiresAt !== null && state.discount.expiresAt < now;

    if (!isExpired) {
      if (state.discount.type === DiscountType.PERCENTAGE) {
        subscriptionPrice =
          subscriptionPrice - (subscriptionPrice * state.discount.value) / 100n;
      } else if (state.discount.type === DiscountType.FIXED) {
        subscriptionPrice = subscriptionPrice - state.discount.value;
        if (subscriptionPrice < 0n) subscriptionPrice = 0n;
      }
    }
  }

  // Get platform fee
  const platformFee = await calculatePlatformFee(config, state.oracleId);

  // Get oracle admin for platform fee payment
  const oracleClient = new OracleClient({
    algorand: config.algorand,
    appId: state.oracleId,
  });
  const oracleAdminState = (
    await oracleClient.state.global.admin()
  ).asByteArray();

  const oracleAdmin =
    oracleAdminState && algosdk.encodeAddress(oracleAdminState);
  if (!oracleAdmin) throw new Error("Oracle admin is not set");

  // Check if subscriber already has a subscription
  const existingSubscription = await getSubscription(
    config,
    params.productId,
    params.subscriber,
  ).catch(() => null);
  const isHoldingExpiredSubscription =
    existingSubscription !== null &&
    !(await isActiveSubscriber(config, params.productId, params.subscriber));

  // Calculate fees
  const subscriptionBoxFee = isHoldingExpiredSubscription
    ? 0n
    : calculateSubscriptionBoxFee() +
      AlgoAmount.Algos(MIN_ASA_CREATE_MBR).microAlgos;

  // Create subscription
  const result = await client.send
    .createSubscription({
      args: {
        subscriber: params.subscriber,
        creatorLocker: creatorLocker,
        oracleId: state.oracleId,
        feeTxn: await config.algorand.createTransaction.payment({
          sender: params.subscriber,
          receiver: client.appAddress,
          amount: AlgoAmount.MicroAlgos(subscriptionBoxFee),
        }),
        platformFeeTxn: await config.algorand.createTransaction.payment({
          sender: params.subscriber,
          receiver: oracleAdmin,
          amount: AlgoAmount.MicroAlgos(state.price > 0n ? platformFee : 0n),
        }),
        payTxn:
          state.coinId === 0n
            ? await config.algorand.createTransaction.payment({
                sender: params.subscriber,
                receiver: getApplicationAddress(creatorLocker),
                amount: AlgoAmount.MicroAlgos(subscriptionPrice),
              })
            : await config.algorand.createTransaction.assetTransfer({
                sender: params.subscriber,
                receiver: getApplicationAddress(creatorLocker),
                amount: subscriptionPrice,
                assetId: state.coinId,
              }),
      },
      maxFee: AlgoAmount.MicroAlgos(100_000n),
      coverAppCallInnerTransactionFees: true,
      sender: params.subscriber,
    })
    .catch((err) => {
      console.error(err);
      throw err;
    });

  return {
    txId: result.txIds[0],
    confirmedRound: result.confirmations?.[0]?.confirmedRound
      ? BigInt(result.confirmations[0].confirmedRound)
      : 0n,
    subscriptionId: result.return!,
  };
}

/**
 * Get subscription details
 */
export async function getSubscription(
  config: SubtopiaConfig,
  productId: bigint,
  subscriber: string,
): Promise<SubscriptionState> {
  const client = await getProductClient(config, productId);

  try {
    const result = await client.getSubscription({
      args: {
        subscriber,
      },
    });

    if (!result) {
      throw new Error("Subscription not found");
    }

    return {
      id: result.subscriptionId,
      productId,
      subscriber,
      createdAt: result.createdAt,
      expiresAt: result.expiresAt === 0n ? null : result.expiresAt,
      duration: result.duration,
    };
  } catch (error: unknown) {
    // Handle expected errors when subscription doesn't exist
    throw new Error("Subscription not found", { cause: error });
  }
}

/**
 * Check if address is an active subscriber
 */
export async function isActiveSubscriber(
  config: SubtopiaConfig,
  productId: bigint,
  subscriber: string,
): Promise<boolean> {
  const client = await getProductClient(config, productId);

  try {
    const result = await client.send.isSubscriber({
      args: {
        subscriber,
      },
    });

    return result.return === 1n;
  } catch {
    return false;
  }
}

/**
 * Claim subscription NFT
 */
export async function claimSubscription(
  config: SubtopiaConfig,
  params: {
    productId: bigint;
    subscriber: string;
    subscriptionId: bigint;
  },
): Promise<BaseResult> {
  const client = await getProductClient(config, params.productId);

  // Check if subscriber needs to opt-in to the NFT
  try {
    await config.algorand.client.algod
      .accountAssetInformation(params.subscriber, Number(params.subscriptionId))
      .do();
  } catch {
    // Need to opt-in first
    await config.algorand.send.assetOptIn({
      sender: params.subscriber,
      assetId: params.subscriptionId,
    });
  }

  const result = await client.send.claimSubscription({
    args: {
      subscription: params.subscriptionId,
    },
    sender: params.subscriber,
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
 * Transfer subscription to another user
 */
export async function transferSubscription(
  config: SubtopiaConfig,
  params: {
    productId: bigint;
    currentSubscriber: string;
    newSubscriber: string;
    subscriptionId: bigint;
  },
): Promise<BaseResult> {
  const client = await getProductClient(config, params.productId);

  const result = await client.send.transferSubscription({
    args: {
      newSubscriber: params.newSubscriber,
      subscription: params.subscriptionId,
    },
    sender: params.currentSubscriber,
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
 * Delete/cancel subscription
 */
export async function deleteSubscription(
  config: SubtopiaConfig,
  params: {
    productId: bigint;
    subscriber: string;
    subscriptionId: bigint;
  },
): Promise<BaseResult> {
  const client = await getProductClient(config, params.productId);

  const result = await client.send.deleteSubscription({
    args: {
      subscription: params.subscriptionId,
    },
    sender: params.subscriber,
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
 * Enable product (manager only)
 */
export async function enableProduct(
  config: SubtopiaConfig,
  params: {
    productId: bigint;
    manager: string;
  },
): Promise<BaseResult> {
  const client = await getProductClient(config, params.productId);

  const result = await client.send.updateLifecycle({
    args: {
      lifecycleState: BigInt(LifecycleState.ENABLED),
    },
    sender: params.manager,
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
 * Disable product (manager only)
 */
export async function disableProduct(
  config: SubtopiaConfig,
  params: {
    productId: bigint;
    manager: string;
  },
): Promise<BaseResult> {
  const client = await getProductClient(config, params.productId);

  const result = await client.send.updateLifecycle({
    args: {
      lifecycleState: BigInt(LifecycleState.DISABLED),
    },
    sender: params.manager,
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
 * Batch fetch subscriptions for multiple products for a single user
 * This is optimized for public gateways to reduce HTTP calls
 */
export async function getSubscriptionBatch(
  config: SubtopiaConfig,
  productIds: bigint[],
  subscriber: string,
): Promise<Map<bigint, SubscriptionState | null>> {
  const results = new Map<bigint, SubscriptionState | null>();

  // Process in parallel for efficiency
  const promises = productIds.map(async (productId) => {
    try {
      const subscription = await getSubscription(config, productId, subscriber);
      results.set(productId, subscription);
    } catch {
      // If subscription doesn't exist, set null
      results.set(productId, null);
    }
  });

  await Promise.all(promises);
  return results;
}

/**
 * Check active subscription status for multiple products efficiently
 */
export async function isActiveSubscriberBatch(
  config: SubtopiaConfig,
  productIds: bigint[],
  subscriber: string,
): Promise<Map<bigint, boolean>> {
  const results = new Map<bigint, boolean>();

  // Process in parallel
  const promises = productIds.map(async (productId) => {
    const isActive = await isActiveSubscriber(config, productId, subscriber);
    results.set(productId, isActive);
  });

  await Promise.all(promises);
  return results;
}

/**
 * Get all active subscriptions for a product
 * Note: This requires iterating through all boxes and can be expensive
 * Use with caution on public gateways
 */
export async function getProductSubscriptions(
  config: SubtopiaConfig,
  productId: bigint,
  activeOnly: boolean = true,
): Promise<SubscriptionState[]> {
  const subscriptions: SubscriptionState[] = [];

  try {
    // Get all box names for this product
    const boxesResponse = await config.algorand.client.algod
      .getApplicationBoxes(Number(productId))
      .do();

    // Process in batches to avoid overwhelming the gateway
    const batchSize = 10;
    const boxes = boxesResponse.boxes || [];

    for (let i = 0; i < boxes.length; i += batchSize) {
      const batch = boxes.slice(i, i + batchSize);

      const batchPromises = batch.map(async (box) => {
        try {
          // Convert box name to address
          const subscriberAddress = algosdk.encodeAddress(box.name);

          // Get subscription details
          const subscription = await getSubscription(
            config,
            productId,
            subscriberAddress,
          );

          if (!activeOnly) {
            return subscription;
          }

          // Check if subscription is active
          const isActive = await isActiveSubscriber(
            config,
            productId,
            subscriberAddress,
          );

          return isActive ? subscription : null;
        } catch {
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      subscriptions.push(
        ...batchResults.filter((s): s is SubscriptionState => s !== null),
      );
    }
  } catch (error) {
    console.error(
      `Failed to fetch subscriptions for product ${productId}:`,
      error,
    );
    throw new Error("Unable to fetch product subscriptions");
  }

  return subscriptions;
}

// Helper functions
async function calculatePlatformFee(
  config: SubtopiaConfig,
  oracleId: bigint,
): Promise<bigint> {
  const oracleClient = new OracleClient({
    algorand: config.algorand,
    appId: oracleId,
  });

  try {
    const result = await oracleClient.computePlatformFee({
      args: {
        wholeUsd: BigInt(SUBSCRIPTION_PLATFORM_FEE_CENTS),
      },
    });

    return result ?? 100_000n; // Default 0.1 ALGO if oracle fails
  } catch {
    return 100_000n; // Default 0.1 ALGO
  }
}

function calculateSubscriptionBoxFee(): bigint {
  // Box storage calculation
  // Box name: 32 bytes (address)
  // Box content: ~100 bytes for subscription data
  const uint64TypeByteLen = new ABIUintType(64).byteLen();
  const subscriptionTypeByteLen = uint64TypeByteLen * 5; // 5 Uint64s in Subscription tuple
  return calculateBoxMbr(
    ADDRESS_BYTE_LENGTH,
    subscriptionTypeByteLen,
    "create",
  );
}
