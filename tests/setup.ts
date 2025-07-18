/**
 * Test setup and utilities for Subtopia SDK
 */
import { AlgorandClient, algo } from "@algorandfoundation/algokit-utils";
import { registerDebugEventHandlers } from "@algorandfoundation/algokit-utils-debug";
import { ChainType } from "../src/core/constants";
import type { SubtopiaConfig } from "../src/core/types";
import "dotenv/config";
import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";

// Config.configure({
//   debug: true,
//   traceAll: false,
// });
registerDebugEventHandlers();

export const createTestConfig = ({
  algorand,
  defaultAccount,
}: {
  algorand: AlgorandClient;
  defaultAccount?: TransactionSignerAccount;
}): SubtopiaConfig => {
  // Only call setSuggestedParamsCacheTimeout if it exists (for AlgorandClient instances)
  if (algorand.setSuggestedParamsCacheTimeout) {
    algorand.setSuggestedParamsCacheTimeout(0);
  }
  return {
    algorand,
    registryId: BigInt(Number(process.env.SUBTOPIA_REGISTRY_ID || "1040")),
    chainType: ChainType.LOCALNET,
    defaultSender: defaultAccount?.addr.toString(),
    defaultSigner: defaultAccount?.signer,
  };
};

export const DEFAULT_PRODUCT_PARAMS = {
  price: algo(1).microAlgos,
  coinId: 0n,
  maxSubscriptions: 100n,
  duration: 2592000n, // 30 days
  unitName: "SUB",
  imageUrl: "https://example.com/image.png",
};

export const FAST_TIMEOUT = 5_000;
export const SLOW_TIMEOUT = 3000_000;
