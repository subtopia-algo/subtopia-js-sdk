// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

import { AssetMetadata } from "./interfaces";

export const DEFAULT_AWAIT_ROUNDS = 10;
export const LOCKER_TEAL_FILENAME = "sml.teal";
export const SUBTOPIA_CONTRACTS_VERSION = "0.3.0";
export const SUBTOPIA_REGISTRY_APP_ID = 182723614;

export const ALGO_ASSET = {
  index: 0,
  creator: "",
  name: "ALGO",
  decimals: 6,
  unitName: "ALGO",
} as AssetMetadata;
