// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

import { AssetMetadata } from "./interfaces";

export const DEFAULT_AWAIT_ROUNDS = 10;
export const LOCKER_TEAL_URL =
  "https://gist.githubusercontent.com/aorumbayev/5a744cebd12af842da64bceb31e5675a/raw/bfb812b75565e05702357e72d8479868c9f18c6a/sml.teal";
export const SUBTOPIA_CONTRACTS_VERSION = "0.1.0";
export const SUBTOPIA_REGISTRY_APP_ID = 167782070;

export const ALGO_ASSET = {
  index: 0,
  creator: "",
  name: "ALGO",
  decimals: 6,
  unitName: "ALGO",
} as AssetMetadata;
