// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

// import { SubtopiaClient } from "./clients/SubtopiaClient";
// import { SubtopiaAdminClient } from "./clients/SubtopiaAdminClient";
import { normalizePrice, optInAsset, optOutAsset } from "./utils";
import { SUBTOPIA_CONTRACTS_VERSION } from "./constants";
import {
  PriceNormalizationType,
  SubscriptionType,
  SubscriptionExpirationType,
  DiscountType,
  SMILifecycle,
} from "./enums";
import {
  Locker,
  SMRGetRegistryParams,
  SMIClaimRevenueParams,
  SMIMarkForDeletionParams,
  SMRAddInfrastructureParams,
  SMRClaimInfrastructureParams,
  SMRTransferInfrastructureParams,
  SMIInputParams,
  SMIDeleteSubscriptionParams,
  SMIClaimSubscriptionParams,
  User,
  SMIState,
  ChainMethodParams,
  SMISubscribeParams,
  SMITransferSubscriptionParams,
  SMIUnsubscribeParams,
  SubscriptionRecord,
  DiscountRecord,
  DiscountMetadata,
  BaseDiscountRecord,
  SMICreateDiscountParams,
  SMIDeleteDiscountParams,
  AssetMetadata,
} from "./interfaces";

export {
  PriceNormalizationType,
  SubscriptionType,
  SubscriptionExpirationType,
  DiscountType,
  normalizePrice,
  SUBTOPIA_CONTRACTS_VERSION,
  SMILifecycle,
  optInAsset,
  optOutAsset,
};

export type {
  Locker,
  SMRGetRegistryParams,
  SMIClaimRevenueParams,
  SMIMarkForDeletionParams,
  SMRAddInfrastructureParams,
  SMRClaimInfrastructureParams,
  SMRTransferInfrastructureParams,
  SMIInputParams,
  SMIDeleteSubscriptionParams,
  SMIClaimSubscriptionParams,
  User,
  SMIState,
  ChainMethodParams,
  SMISubscribeParams,
  SMITransferSubscriptionParams,
  SMIUnsubscribeParams,
  SubscriptionRecord,
  DiscountRecord,
  DiscountMetadata,
  BaseDiscountRecord,
  SMICreateDiscountParams,
  SMIDeleteDiscountParams,
  AssetMetadata,
};
