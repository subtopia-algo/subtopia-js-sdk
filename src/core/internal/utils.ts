/**
 * Internal utility functions for the Subtopia SDK
 *
 * These utilities are not exposed in the public API and are used
 * internally by the SDK for common operations.
 */

import { Arc56Contract } from "@algorandfoundation/algokit-utils/types/app-arc56";
import algosdk, { ABIArrayDynamicType, ABIType } from "algosdk";
import { APP_PAGE_MAX_SIZE } from "../constants";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";

/**
 * Get asset information by ID
 * @internal
 */
interface AssetInfo {
  index: number | bigint;
  params: {
    name?: string;
    "unit-name"?: string;
    decimals: number;
    // Allow additional properties from the API
    [key: string]: unknown;
  };
}

export async function getAssetByID(
  algodClient: algosdk.Algodv2,
  assetID: number,
): Promise<AssetInfo> {
  if (assetID === 0) {
    return {
      index: 0,
      params: {
        name: "Algorand",
        "unit-name": "ALGO",
        decimals: 6,
      },
    };
  }

  try {
    const assetInfo = await algodClient.getAssetByID(assetID).do();
    // Map the API response to our AssetInfo type
    return {
      params: {
        decimals: assetInfo.params.decimals,
        name: assetInfo.params.name,
        "unit-name": assetInfo.params.unitName,
      },
    } as AssetInfo;
  } catch (error) {
    throw new Error(`Failed to get asset ${assetID}: ${error}`);
  }
}

/**
 * Format microAlgos to a human-readable string
 * @internal
 */
export function formatMicroAlgos(
  microAlgos: bigint,
  decimals: number = 6,
): string {
  const divisor = BigInt(10 ** decimals);
  const whole = microAlgos / divisor;
  const fraction = microAlgos % divisor;

  if (fraction === 0n) {
    return whole.toString();
  }

  const fractionStr = fraction
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  return `${whole}.${fractionStr}`;
}

/**
 * Calculate box storage cost
 * @internal
 */
export function calculateBoxStorageCost(boxSize: bigint): bigint {
  const BASE_BOX_COST = 2500n;
  const PER_BYTE_COST = 400n;
  return BASE_BOX_COST + PER_BYTE_COST * boxSize;
}

/**
 * Validate address format
 * @internal
 */
export function isValidAddress(address: string): boolean {
  try {
    algosdk.decodeAddress(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current Unix timestamp in seconds
 * @internal
 */
export function getCurrentTimestamp(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}

/**
 * Check if a timestamp has expired
 * @internal
 */
export function hasExpired(expiresAt: bigint): boolean {
  return getCurrentTimestamp() > expiresAt;
}

/**
 * Calculate subscription expiry
 * @internal
 */
export function calculateExpiry(duration: bigint): bigint {
  return getCurrentTimestamp() + duration;
}

export async function calculateExtraPages(
  approval: Uint8Array,
  clear: Uint8Array,
): Promise<number> {
  return Math.floor((approval.length + clear.length) / APP_PAGE_MAX_SIZE);
}

export function calculateCreationMbr(
  extraProgramPages: number,
  globalNumUint: number,
  globalNumByteSlice: number,
): bigint {
  return (
    BigInt(100_000) * BigInt(1 + extraProgramPages) +
    BigInt(25_000 + 3_500) * BigInt(globalNumUint) +
    BigInt(25_000 + 25_000) * BigInt(globalNumByteSlice)
  );
}

export async function calculateContractCreationMbr(
  appSpec: Arc56Contract,
  algorand: AlgorandClient,
): Promise<bigint> {
  const computedExtraPages = await calculateExtraPages(
    (
      await algorand.app.compileTeal(
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        Buffer.from(appSpec.source?.approval!, "base64").toString("utf-8"),
      )
    ).compiledBase64ToBytes,
    (
      await algorand.app.compileTeal(
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        Buffer.from(appSpec.source?.clear!, "base64").toString("utf-8"),
      )
    ).compiledBase64ToBytes,
  );

  return calculateCreationMbr(
    computedExtraPages,
    appSpec.state.schema.global.ints,
    appSpec.state.schema.global.bytes,
  );
}

export function calculateBoxMbr(
  name: string | number | Uint8Array,
  size: number,
  action: string,
  abiType: ABIType | null = null,
): bigint {
  if (action !== "create" && action !== "destroy") {
    throw new Error("Action must be 'create' or 'destroy'");
  }
  const nameSize = typeof name === "number" ? name : name.length;
  let mbrChange = 2_500 + 400 * (nameSize + size);

  if (abiType !== null) {
    if (abiType instanceof ABIArrayDynamicType) {
      mbrChange += 800;
    } else {
      throw new Error(`Unknown abi type: ${abiType}`);
    }
  }

  return BigInt(action === "create" ? mbrChange : -mbrChange);
}
