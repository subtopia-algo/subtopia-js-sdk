// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

/* eslint-disable @typescript-eslint/no-unused-vars */
import { SubtopiaClient } from "./client";
import { SubtopiaAdminClient } from "./adminClient";
import {
  getLocker,
  loadApplicationState,
  normalizePrice,
} from "./common/utils";
import {
  SUBTOPIA_CONTRACTS_VERSION,
  SUBTOPIA_REGISTRY_APP_ID,
} from "./common/constants";
import {
  PriceNormalizationType,
  SubscriptionType,
  SMILifecycle,
} from "./common/enums";
import {
  SMIClaimSubscriptionParams,
  SMIState,
  ChainMethodParams,
  SMISubscribeParams,
  SMITransferSubscriptionParams,
  SMIUnsubscribeParams,
  SMIMarkForDeletionParams,
  SMRAddInfrastructureParams,
  SMRClaimInfrastructureParams,
  SMRTransferInfrastructureParams,
  SMIInputParams,
  SMRGetRegistryParams,
  SMIClaimRevenueParams,
  SubscriptionRecord,
  SMIDeleteSubscriptionParams,
  Locker,
  User,
} from "./common/interfaces";

export {
  PriceNormalizationType,
  SubtopiaAdminClient,
  SubtopiaClient,
  SubscriptionType,
  getLocker,
  loadApplicationState,
  normalizePrice,
};

export type {
  Locker,
  SUBTOPIA_CONTRACTS_VERSION,
  SUBTOPIA_REGISTRY_APP_ID,
  SMILifecycle,
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
};
