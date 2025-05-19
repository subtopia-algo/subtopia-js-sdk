import { Address } from "algosdk";

/**
 * Interface for the asset metadata.
 */
export interface AssetMetadata {
  index: number;
  creator: Address;
  name: string;
  decimals: number;
  unitName: string;
}
