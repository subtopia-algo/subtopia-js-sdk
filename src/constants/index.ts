// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

import { ChainType } from "../enums";
import { AssetMetadata } from "../interfaces";

export const DEFAULT_AWAIT_ROUNDS = 10;
export const SUBTOPIA_CONTRACTS_VERSION = "0.3.0";
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

export const SMI_STATE_MANAGER_KEY = "manager";
export const SMI_APPROVAL_KEY = "infrastructure_approval";
export const SMI_CLEAR_KEY = "infrastructure_clear";
export const SML_APPROVAL_KEY = "locker_approval";
export const SML_CLEAR_KEY = "locker_clear";

export const MIN_APP_BALANCE_MBR = 0.1; // ALGO
export const MIN_APP_OPTIN_MBR = 0.1; // ALGO
export const MIN_ASA_OPTIN_MBR = 0.1; // ALGO
export const MIN_ASA_CREATE_MBR = 0.1; // ALGO

// Platform fees
export const SUBSCRIPTION_PLATFORM_FEE_CENTS = 10;
export const SMI_CREATION_PLATFORM_FEE_CENTS = 500;

// Algorand minimum transaction fee
export const SMR_VERSION = "1.0";
export const SMI_VERSION = "1.0";
export const SML_VERSION = "1.0";
export const SMA_VERSION = "1.0";
