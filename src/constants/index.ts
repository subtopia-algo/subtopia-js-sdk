// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

import { Address } from "algosdk";
import { ChainType } from "../types/enums";
import { AssetMetadata } from "types";

export const DEFAULT_AWAIT_ROUNDS = 10;
export const SUBTOPIA_TESTNET = 485920861;
export const SUBTOPIA_MAINNET = 1257359052;
export const SUBTOPIA_REGISTRY_ID = (chainType: ChainType) => {
  if (chainType === ChainType.MAINNET) {
    return SUBTOPIA_MAINNET;
  } else if (chainType === ChainType.TESTNET) {
    return SUBTOPIA_TESTNET;
  } else {
    // Check if SUBTOPIA_REGISTRY_ID environment variable exists and is a number
    const subtopiaRegistryId =
      Number(process.env.SUBTOPIA_REGISTRY_ID) ||
      Number(process.env.NEXT_PUBLIC_SUBTOPIA_REGISTRY_ID);
    if (!isNaN(subtopiaRegistryId)) {
      return subtopiaRegistryId;
    } else {
      throw new Error(
        "SUBTOPIA_REGISTRY_ID environment variable is not set or is not a number",
      );
    }
  }
};

export const ALGO_ASSET = {
  index: 0n,
  creator: Address.fromString(
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ",
  ),
  name: "ALGO",
  decimals: 6,
  unitName: "ALGO",
} as AssetMetadata;

export const LEGACY_PRODUCT_VERSION_KEY = "product_version";

export const TOKEN_PRODUCT_STATE_MANAGER_KEY = "gs_3";
export const TOKEN_PRODUCT_VERSION_KEY = "token_product_version";
export const TOKEN_PRODUCT_APPROVAL_KEY = "token_product_approval";
export const TOKEN_PRODUCT_CLEAR_KEY = "token_product_clear";
export const LOCKER_VERSION_KEY = "locker_version";
export const LOCKER_APPROVAL_KEY = "locker_approval";
export const LOCKER_CLEAR_KEY = "locker_clear";

export const MIN_APP_OPTIN_MBR = 0.1; // ALGO
export const MIN_APP_CREATE_MBR = 0.1; // ALGO
export const MIN_ASA_OPTIN_MBR = 0.1; // ALGO
export const MIN_ASA_CREATE_MBR = 0.1; // ALGO

// Platform fees
export const SUBSCRIPTION_PLATFORM_FEE_CENTS = 10;
export const PRODUCT_CREATION_PLATFORM_FEE_CENTS = 500;

// Algorand minimum transaction fee
export const REGISTRY_VERSION = "1.1";
export const LEGACY_PRODUCT_VERSION = "1.1";
export const TOKEN_BASED_PRODUCT_VERSION = "1.0";
export const LOCKER_VERSION = "1.0";
export const ORACLE_VERSION = "1.0";

// Locker creation
export const LOCKER_EXTRA_PAGES = 0;
export const LOCKER_GLOBAL_NUM_UINTS = 1;
export const LOCKER_GLOBAL_NUM_BYTE_SLICES = 1;
export const LOCKER_LOCAL_NUM_UINTS = 0;
export const LOCKER_LOCAL_NUM_BYTE_SLICES = 0;

// Misc
export const DEFAULT_TXN_SIGN_TIMEOUT_SECONDS = 60;
export const DISCOUNT_BOX_KEY = "b_d";
export const ENCODED_DISCOUNT_BOX_KEY = new Uint8Array(
  Buffer.from(DISCOUNT_BOX_KEY),
);
