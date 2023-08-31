// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

import { ChainType } from "../enums";
import { AssetMetadata } from "../interfaces";

export const DEFAULT_AWAIT_ROUNDS = 10;
export const TESTNET_SUBTOPIA_REGISTRY_ID = 269954941;
export const MAINNET_SUBTOPIA_REGISTRY_ID = 269954941;
export const SUBTOPIA_REGISTRY_ID = (chainType: ChainType) => {
  if (chainType === ChainType.MAINNET) {
    return TESTNET_SUBTOPIA_REGISTRY_ID;
  } else {
    return MAINNET_SUBTOPIA_REGISTRY_ID;
  }
};

export const ALGO_ASSET = {
  index: 0,
  creator: "",
  name: "ALGO",
  decimals: 6,
  unitName: "ALGO",
} as AssetMetadata;

export const PRODUCT_STATE_MANAGER_KEY = "manager";
export const PRODUCT_APPROVAL_KEY = "infrastructure_approval";
export const PRODUCT_CLEAR_KEY = "infrastructure_clear";
export const LOCKER_APPROVAL_KEY = "locker_approval";
export const LOCKER_CLEAR_KEY = "locker_clear";

export const MIN_APP_BALANCE_MBR = 0.1; // ALGO
export const MIN_APP_OPTIN_MBR = 0.1; // ALGO
export const MIN_ASA_OPTIN_MBR = 0.1; // ALGO
export const MIN_ASA_CREATE_MBR = 0.1; // ALGO

// Platform fees
export const SUBSCRIPTION_PLATFORM_FEE_CENTS = 10;
export const PRODUCT_CREATION_PLATFORM_FEE_CENTS = 500;

// Algorand minimum transaction fee
export const REGISTRY_VERSION = "1.0";
export const PRODUCTVERSION = "1.0";
export const LOCKER_VERSION = "1.0";
export const ORACLE_VERSION = "1.0";
