import { describe, it, expect } from "vitest";
import { asyncWithTimeout } from "../src/utils";
import { ChainType, SUBTOPIA_REGISTRY_ID } from "../src";

describe("asyncWithTimeout", () => {
  // Function returns a promise that resolves with the expected result
  it("should resolve with the expected result when the function completes within the timeout", async () => {
    const expectedResult = "result";
    const myAsyncFunction = async () => {
      return new Promise<string>((resolve) => {
        setTimeout(() => {
          resolve(expectedResult);
        }, 500);
      });
    };

    const result = await asyncWithTimeout(myAsyncFunction, 1);
    expect(result).toEqual(expectedResult);
  });

  // Function returns a promise that rejects with an error when the function takes longer than the timeout to complete
  it("should reject with an error when the function takes longer than the timeout to complete", async () => {
    const myAsyncFunction = async () => {
      return new Promise<string>((resolve) => {
        setTimeout(() => {
          resolve("result");
        }, 2000);
      });
    };

    await expect(asyncWithTimeout(myAsyncFunction, 1)).rejects.toEqual(
      new Error("Timeout error: exceeded 1 seconds")
    );
  }, 100000);

  it("should throw an error if localnet is chain type and no env var is set", () => {
    expect(() => SUBTOPIA_REGISTRY_ID(ChainType.LOCALNET)).toThrow(
      "SUBTOPIA_REGISTRY_ID environment variable is not set or is not a number"
    );
  }, 100000);
});
