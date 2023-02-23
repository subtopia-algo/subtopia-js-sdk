import { Algodv2, generateAccount } from "algosdk";
import { Subtopia } from "../src/index";
import { vi, it, describe, expect } from "vitest";

describe("subtopia", () => {
  it("should correctly load approval and clear programs", async () => {
    const client = new Algodv2(``, `https://testnet-api.algonode.cloud`, ``);
    const randomAccounts = generateAccount();

    const dummySigner = vi.fn();

    const instance = await Subtopia.init(
      client,
      randomAccounts.addr,
      dummySigner,
      157948040
    );

    expect(instance).toBeDefined();
    expect(instance.approvalProgram).toBeDefined();
    expect(instance.clearProgram).toBeDefined();
  });
});
