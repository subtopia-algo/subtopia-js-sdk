// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

import { AssetMetadata } from "../interfaces";

export const DEFAULT_AWAIT_ROUNDS = 10;
export const SUBTOPIA_CONTRACTS_VERSION = "0.3.0";

export const ALGO_ASSET = {
  index: 0,
  creator: "",
  name: "ALGO",
  decimals: 6,
  unitName: "ALGO",
} as AssetMetadata;

export const SMI_STATE_MANAGER_KEY = "manager";
export const SMI_APPROVAL_KEY = "smi_approval";
export const SMI_CLEAR_KEY = "smi_clear";
export const SML_APPROVAL_KEY = "sml_approval";
export const SML_CLEAR_KEY = "sml_clear";

export const MIN_APP_BALANCE_MBR = 0.1; // ALGO
export const MIN_APP_OPTIN_MBR = 0.1; // ALGO
export const MIN_ASA_OPTIN_MBR = 0.1; // ALGO

// Platform fees
export const SUBSCRIPTION_PLATFORM_FEE_CENTS = 10;
export const SMI_CREATION_PLATFORM_FEE_CENTS = 500;

// Algorand minimum transaction fee
export const SMR_VERSION = "1.0";
export const SMI_VERSION = "1.0";
export const SML_VERSION = "1.0";
export const SMA_VERSION = "1.0";
