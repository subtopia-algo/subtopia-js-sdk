/**
 * Core layer exports for Subtopia SDK
 *
 * This layer provides pure functions that wrap the typed clients
 * with a clean, simple API for interacting with Subtopia contracts.
 */

// Types
export * from "./types";

// Registry operations
export {
  createProduct,
  transferProduct,
  deleteProduct,
  getLocker,
  createLocker,
  getOrCreateLocker,
  getProductVersion,
  getLockerVersion,
} from "./registry";

// Product operations
export {
  getProductState,
  getProductDiscount,
  subscribe,
  getSubscription,
  getSubscriptionBatch,
  isActiveSubscriber,
  isActiveSubscriberBatch,
  getProductSubscriptions,
  claimSubscription,
  transferSubscription,
  deleteSubscription,
  enableProduct,
  disableProduct,
} from "./products";

// Re-export enums and constants for convenience
export {
  ChainType,
  LockerType,
  ProductType,
  DiscountType,
  LifecycleState,
  TimeUnit,
  ErrorCode,
  SUBTOPIA_REGISTRY_ID,
  SUBTOPIA_DEFAULT_IMAGE_URL,
  SUBTOPIA_DEFAULT_UNIT_NAME,
  MIN_APP_CREATE_MBR,
  MIN_APP_OPTIN_MBR,
  MIN_ASA_CREATE_MBR,
  MIN_ASA_OPTIN_MBR,
  PRODUCT_CREATION_PLATFORM_FEE_CENTS,
  SUBSCRIPTION_PLATFORM_FEE_CENTS,
} from "./constants";
