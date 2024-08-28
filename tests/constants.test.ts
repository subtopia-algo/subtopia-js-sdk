import { describe, it, expect, vi } from "vitest";
import * as constants from "../src/constants";
import { ChainType } from "../src/types/enums";

describe("Constants", () => {
  it("should have correct DEFAULT_AWAIT_ROUNDS", () => {
    expect(constants.DEFAULT_AWAIT_ROUNDS).toBe(10);
  });

  it("should have correct SUBTOPIA_TESTNET and SUBTOPIA_MAINNET", () => {
    expect(constants.SUBTOPIA_TESTNET).toBe(485920861);
    expect(constants.SUBTOPIA_MAINNET).toBe(1257359052);
  });

  describe("SUBTOPIA_REGISTRY_ID", () => {
    it("should return SUBTOPIA_MAINNET for ChainType.MAINNET", () => {
      expect(constants.SUBTOPIA_REGISTRY_ID(ChainType.MAINNET)).toBe(
        constants.SUBTOPIA_MAINNET,
      );
    });

    it("should return SUBTOPIA_TESTNET for ChainType.TESTNET", () => {
      expect(constants.SUBTOPIA_REGISTRY_ID(ChainType.TESTNET)).toBe(
        constants.SUBTOPIA_TESTNET,
      );
    });

    it("should use environment variable for other chain types", () => {
      const originalEnv = process.env;
      vi.stubEnv("SUBTOPIA_REGISTRY_ID", "123456789");

      expect(constants.SUBTOPIA_REGISTRY_ID("devnet" as ChainType)).toBe(
        123456789,
      );

      process.env = originalEnv;
    });

    it("should throw an error if environment variable is not set", () => {
      const originalEnv = process.env;
      delete process.env.SUBTOPIA_REGISTRY_ID;
      delete process.env.NEXT_PUBLIC_SUBTOPIA_REGISTRY_ID;

      expect(() =>
        constants.SUBTOPIA_REGISTRY_ID("blanet" as ChainType),
      ).toThrow(
        "SUBTOPIA_REGISTRY_ID environment variable is not set or is not a number",
      );

      process.env = originalEnv;
    });
  });

  it("should have correct ALGO_ASSET", () => {
    expect(constants.ALGO_ASSET).toEqual({
      index: 0,
      creator: "",
      name: "ALGO",
      decimals: 6,
      unitName: "ALGO",
    });
  });

  it("should have correct key constants", () => {
    expect(constants.LEGACY_PRODUCT_VERSION_KEY).toBe("product_version");
    expect(constants.TOKEN_PRODUCT_STATE_MANAGER_KEY).toBe("gs_3");
    expect(constants.TOKEN_PRODUCT_VERSION_KEY).toBe("token_product_version");
    expect(constants.TOKEN_PRODUCT_APPROVAL_KEY).toBe("token_product_approval");
    expect(constants.TOKEN_PRODUCT_CLEAR_KEY).toBe("token_product_clear");
    expect(constants.LOCKER_VERSION_KEY).toBe("locker_version");
    expect(constants.LOCKER_APPROVAL_KEY).toBe("locker_approval");
    expect(constants.LOCKER_CLEAR_KEY).toBe("locker_clear");
  });

  it("should have correct MBR constants", () => {
    expect(constants.MIN_APP_OPTIN_MBR).toBe(0.1);
    expect(constants.MIN_APP_CREATE_MBR).toBe(0.1);
    expect(constants.MIN_ASA_OPTIN_MBR).toBe(0.1);
    expect(constants.MIN_ASA_CREATE_MBR).toBe(0.1);
  });

  it("should have correct platform fee constants", () => {
    expect(constants.SUBSCRIPTION_PLATFORM_FEE_CENTS).toBe(10);
    expect(constants.PRODUCT_CREATION_PLATFORM_FEE_CENTS).toBe(500);
  });

  it("should have correct version constants", () => {
    expect(constants.REGISTRY_VERSION).toBe("1.1");
    expect(constants.LEGACY_PRODUCT_VERSION).toBe("1.1");
    expect(constants.TOKEN_BASED_PRODUCT_VERSION).toBe("1.0");
    expect(constants.LOCKER_VERSION).toBe("1.0");
    expect(constants.ORACLE_VERSION).toBe("1.0");
  });

  it("should have correct locker creation constants", () => {
    expect(constants.LOCKER_EXTRA_PAGES).toBe(0);
    expect(constants.LOCKER_GLOBAL_NUM_UINTS).toBe(1);
    expect(constants.LOCKER_GLOBAL_NUM_BYTE_SLICES).toBe(1);
    expect(constants.LOCKER_LOCAL_NUM_UINTS).toBe(0);
    expect(constants.LOCKER_LOCAL_NUM_BYTE_SLICES).toBe(0);
  });

  it("should have correct miscellaneous constants", () => {
    expect(constants.DEFAULT_TXN_SIGN_TIMEOUT_SECONDS).toBe(60);
    expect(constants.DISCOUNT_BOX_KEY).toBe("b_d");
    expect(constants.ENCODED_DISCOUNT_BOX_KEY).toEqual(
      new Uint8Array(Buffer.from("b_d")),
    );
  });
});
