// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

import { SubtopiaClient } from "./clients/SubtopiaClient";
import { SubtopiaAdminClient } from "./clients/SubtopiaAdminClient";
import {
  getLocker,
  loadApplicationState,
  normalizePrice,
  optInAsset,
  optOutAsset,
} from "./utils";
import {
  SUBTOPIA_CONTRACTS_VERSION,
  SUBTOPIA_REGISTRY_APP_ID,
} from "./constants";
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
  SubtopiaAdminClient,
  SubtopiaClient,
  SubscriptionType,
  SubscriptionExpirationType,
  DiscountType,
  getLocker,
  loadApplicationState,
  normalizePrice,
  SUBTOPIA_CONTRACTS_VERSION,
  SUBTOPIA_REGISTRY_APP_ID,
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
