// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

import {
  normalizePrice,
  optInAsset,
  optOutAsset,
  getLockerBoxPrefix,
  durationToMonths,
} from "./utils";
import { SubtopiaClient, SubtopiaRegistryClient } from "./clients";

export {
  SubtopiaClient,
  SubtopiaRegistryClient,
  normalizePrice,
  optInAsset,
  optOutAsset,
  durationToMonths,
  getLockerBoxPrefix,
};

export * from "./interfaces";
export * from "./enums";
export {
  LOCKER_VERSION,
  REGISTRY_VERSION,
  ORACLE_VERSION,
  PRODUCT_VERSION,
  SUBTOPIA_MAINNET,
  SUBTOPIA_TESTNET,
  SUBTOPIA_REGISTRY_ID,
  DEFAULT_TXN_SIGN_TIMEOUT_SECONDS,
  LOCKER_APPROVAL_KEY,
  LOCKER_VERSION_KEY,
  LOCKER_CLEAR_KEY,
  PRODUCT_APPROVAL_KEY,
  PRODUCT_CLEAR_KEY,
  PRODUCT_VERSION_KEY,
} from "./constants";
