import { Address } from "algosdk";

/**
 * Interface for the asset metadata.
 */
export interface AssetMetadata {
  index: bigint;
  creator: Address;
  name: string;
  decimals: number;
  unitName: string;
}
