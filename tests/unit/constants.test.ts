import { describe, it, expect } from "vitest";
import {
  SUBTOPIA_REGISTRY_ID,
  ChainType,
  SUBTOPIA_DEFAULT_IMAGE_URL,
  SUBTOPIA_DEFAULT_UNIT_NAME,
  MIN_APP_CREATE_MBR,
  MIN_APP_OPTIN_MBR,
  MIN_ASA_CREATE_MBR,
  MIN_ASA_OPTIN_MBR,
  PRODUCT_CREATION_PLATFORM_FEE_CENTS,
  SUBSCRIPTION_PLATFORM_FEE_CENTS,
  ProductType,
  LockerType,
  DiscountType,
  LifecycleState,
  TimeUnit,
  ErrorCode,
} from "../../src/core/constants";

describe("Constants", () => {
  describe("SUBTOPIA_REGISTRY_ID", () => {
    it("should return correct mainnet registry ID", () => {
      expect(SUBTOPIA_REGISTRY_ID(ChainType.MAINNET)).toBe(453816186);
    });

    it("should return correct testnet registry ID", () => {
      expect(SUBTOPIA_REGISTRY_ID(ChainType.TESTNET)).toBe(582962704);
    });

    it("should return mainnet registry ID for other chain types", () => {
      expect(SUBTOPIA_REGISTRY_ID(ChainType.LOCALNET)).toBe(453816186);
      expect(SUBTOPIA_REGISTRY_ID(ChainType.BETANET)).toBe(453816186);
    });
  });

  it("should have correct default values", () => {
    expect(SUBTOPIA_DEFAULT_IMAGE_URL).toBe(
      "https://ipfs.algonode.xyz/ipfs/bafybeiatmhfeoxvhfotpmmn2p3ufxadbfk3chhe35lp3jvdh5atfkm6qnu",
    );
    expect(SUBTOPIA_DEFAULT_UNIT_NAME).toBe("SUB");
  });

  it("should have correct MBR constants", () => {
    expect(MIN_APP_CREATE_MBR).toBe(0.1);
    expect(MIN_APP_OPTIN_MBR).toBe(0.1);
    expect(MIN_ASA_CREATE_MBR).toBe(0.1);
    expect(MIN_ASA_OPTIN_MBR).toBe(0.1);
  });

  it("should have correct platform fee constants", () => {
    expect(PRODUCT_CREATION_PLATFORM_FEE_CENTS).toBe(500);
    expect(SUBSCRIPTION_PLATFORM_FEE_CENTS).toBe(10);
  });

  describe("Enums", () => {
    it("should have correct ChainType values", () => {
      expect(ChainType.MAINNET).toBe("mainnet");
      expect(ChainType.TESTNET).toBe("testnet");
      expect(ChainType.BETANET).toBe("betanet");
      expect(ChainType.LOCALNET).toBe("localnet");
    });

    it("should have correct ProductType values", () => {
      expect(ProductType.TOKEN_BASED).toBe(2);
    });

    it("should have correct LockerType values", () => {
      expect(LockerType.CREATOR).toBe(0);
      expect(LockerType.USER).toBe(1);
    });

    it("should have correct DiscountType values", () => {
      expect(DiscountType.PERCENTAGE).toBe(0);
      expect(DiscountType.FIXED).toBe(1);
    });

    it("should have correct LifecycleState values", () => {
      expect(LifecycleState.ENABLED).toBe(0);
      expect(LifecycleState.DISABLED).toBe(1);
    });

    it("should have correct TimeUnit values", () => {
      expect(TimeUnit.UNLIMITED).toBe(0);
      expect(TimeUnit.DAY).toBe(86400);
      expect(TimeUnit.MONTH).toBe(2592000);
      expect(TimeUnit.QUARTER).toBe(7776000);
      expect(TimeUnit.SEMI_ANNUAL).toBe(15552000);
      expect(TimeUnit.ANNUAL).toBe(31536000);
    });

    it("should have correct ErrorCode values", () => {
      expect(ErrorCode.PRODUCT_NOT_FOUND).toBe("PRODUCT_NOT_FOUND");
      expect(ErrorCode.PRODUCT_DISABLED).toBe("PRODUCT_DISABLED");
      expect(ErrorCode.SUBSCRIPTION_NOT_FOUND).toBe("SUBSCRIPTION_NOT_FOUND");
      expect(ErrorCode.SUBSCRIPTION_EXPIRED).toBe("SUBSCRIPTION_EXPIRED");
      expect(ErrorCode.LOCKER_NOT_FOUND).toBe("LOCKER_NOT_FOUND");
      expect(ErrorCode.INSUFFICIENT_BALANCE).toBe("INSUFFICIENT_BALANCE");
      expect(ErrorCode.NETWORK_ERROR).toBe("NETWORK_ERROR");
      expect(ErrorCode.INVALID_PARAMETER).toBe("INVALID_PARAMETER");
    });
  });
});
