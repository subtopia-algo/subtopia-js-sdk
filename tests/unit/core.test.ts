import { describe, it, expect, beforeEach } from "vitest";
import { algo } from "@algorandfoundation/algokit-utils";
import { algorandFixture } from "@algorandfoundation/algokit-utils/testing";
import * as core from "../../src/core";
import { LockerType } from "../../src/core/constants";
import {
  createTestConfig,
  DEFAULT_PRODUCT_PARAMS,
  FAST_TIMEOUT,
  SLOW_TIMEOUT,
} from "../setup";

describe("Core Layer", () => {
  const fixture = algorandFixture();
  beforeEach(fixture.newScope, 10_000); // Add a 10s timeout to cater for occasionally slow LocalNet calls

  describe("Registry Operations", () => {
    it(
      "should get product version",
      async () => {
        const { testAccount } = fixture.context;
        const config = createTestConfig({
          algorand: fixture.context.algorand,
          defaultAccount: testAccount,
        });
        const version = await core.getProductVersion(config);

        expect(version).toBeDefined();
        expect(typeof version).toBe("string");
      },
      FAST_TIMEOUT,
    );

    it(
      "should get locker version",
      async () => {
        const { testAccount } = fixture.context;
        const config = createTestConfig({
          algorand: fixture.context.algorand,
          defaultAccount: testAccount,
        });
        const version = await core.getLockerVersion(config);

        expect(version).toBeDefined();
        expect(typeof version).toBe("string");
      },
      FAST_TIMEOUT,
    );

    it(
      "should get or create locker for creator",
      async () => {
        const { testAccount } = fixture.context;
        const config = createTestConfig({
          algorand: fixture.context.algorand,
          defaultAccount: testAccount,
        });

        const lockerInfo = await core.getOrCreateLocker(
          config,
          testAccount.addr.toString(),
          LockerType.CREATOR,
        );

        expect(lockerInfo).toBeDefined();
        expect(typeof lockerInfo.id).toBe("bigint");
        expect(lockerInfo.id).toBeGreaterThan(0n);
      },
      FAST_TIMEOUT,
    );

    it(
      "should create product successfully",
      async () => {
        const { testAccount } = fixture.context;
        const config = createTestConfig({
          algorand: fixture.context.algorand,
          defaultAccount: testAccount,
        });

        const result = await core.createProduct(config, {
          name: "Test Product",
          subscriptionName: "Premium",
          creator: testAccount.addr.toString(),
          ...DEFAULT_PRODUCT_PARAMS,
        });

        expect(result.productId).toBeDefined();
        expect(typeof result.productId).toBe("bigint");
        expect(result.productId).toBeGreaterThan(0n);
        expect(result.txId).toBeDefined();
        expect(result.confirmedRound).toBeDefined();
      },
      SLOW_TIMEOUT,
    );
  });

  describe("Product Operations", () => {
    it(
      "should get product state",
      async () => {
        const { testAccount } = fixture.context;
        const config = createTestConfig({
          algorand: fixture.context.algorand,
          defaultAccount: testAccount,
        });

        const productResult = await core.createProduct(config, {
          name: "State Test Product",
          subscriptionName: "Basic",
          creator: testAccount.addr.toString(),
          ...DEFAULT_PRODUCT_PARAMS,
        });

        const productState = await core.getProductState(
          config,
          productResult.productId,
        );

        expect(productState.id).toBe(productResult.productId);
        expect(productState.name).toBe("State Test Product");
        expect(productState.subscriptionName).toBe("Basic");
        expect(productState.manager).toBe(testAccount.addr.toString());
        expect(productState.price).toBe(DEFAULT_PRODUCT_PARAMS.price);
      },
      SLOW_TIMEOUT,
    );

    it(
      "should subscribe to product",
      async () => {
        const { testAccount, generateAccount } = fixture.context;
        const config = createTestConfig({
          algorand: fixture.context.algorand,
          defaultAccount: testAccount,
        });

        const productResult = await core.createProduct(config, {
          name: "Subscribe Test Product",
          subscriptionName: "Standard",
          creator: testAccount.addr.toString(),
          ...DEFAULT_PRODUCT_PARAMS,
        });

        const subscriber = await generateAccount({ initialFunds: algo(5) });

        const subscribeResult = await core.subscribe(config, {
          productId: productResult.productId,
          subscriber: subscriber.addr.toString(),
        });

        expect(subscribeResult.subscriptionId).toBeDefined();
        expect(typeof subscribeResult.subscriptionId).toBe("bigint");
        expect(subscribeResult.subscriptionId).toBeGreaterThan(0n);
        expect(subscribeResult.txId).toBeDefined();
      },
      SLOW_TIMEOUT,
    );

    it(
      "should check active subscriber status",
      async () => {
        const { testAccount, generateAccount } = fixture.context;
        const config = createTestConfig({
          algorand: fixture.context.algorand,
          defaultAccount: testAccount,
        });

        await core.getOrCreateLocker(
          config,
          testAccount.addr.toString(),
          LockerType.CREATOR,
        );
        const productResult = await core.createProduct(config, {
          name: "Active Check Product",
          subscriptionName: "Pro",
          creator: testAccount.addr.toString(),
          ...DEFAULT_PRODUCT_PARAMS,
        });

        const subscriber = await generateAccount({ initialFunds: algo(5) });
        await core.subscribe(config, {
          productId: productResult.productId,
          subscriber: subscriber.addr.toString(),
        });

        const isActive = await core.isActiveSubscriber(
          config,
          productResult.productId,
          subscriber.addr.toString(),
        );
        expect(isActive).toBe(true);
      },
      SLOW_TIMEOUT,
    );

    it(
      "should get subscription details",
      async () => {
        const { testAccount, generateAccount } = fixture.context;
        const config = createTestConfig({
          algorand: fixture.context.algorand,
          defaultAccount: testAccount,
        });

        const productResult = await core.createProduct(config, {
          name: "Subscription Details Product",
          subscriptionName: "Enterprise",
          creator: testAccount.addr.toString(),
          ...DEFAULT_PRODUCT_PARAMS,
        });

        const subscriber = await generateAccount({ initialFunds: algo(5) });
        const subscribeResult = await core.subscribe(config, {
          productId: productResult.productId,
          subscriber: subscriber.addr.toString(),
        });

        const subscription = await core.getSubscription(
          config,
          productResult.productId,
          subscriber.addr.toString(),
        );

        expect(subscription).toBeDefined();
        expect(subscription.id).toBe(subscribeResult.subscriptionId);
        expect(subscription.subscriber).toBe(subscriber.addr.toString());
        expect(subscription.productId).toBe(productResult.productId);
      },
      SLOW_TIMEOUT,
    );
  });

  describe("Batch Operations", () => {
    it(
      "should batch fetch subscriptions for multiple products",
      async () => {
        const { testAccount, generateAccount } = fixture.context;
        const config = createTestConfig({
          algorand: fixture.context.algorand,
          defaultAccount: testAccount,
        });

        // Create locker
        await core.getOrCreateLocker(
          config,
          testAccount.addr.toString(),
          LockerType.CREATOR,
        );

        // Create multiple products
        const productIds: bigint[] = [];
        for (let i = 0; i < 3; i++) {
          const result = await core.createProduct(config, {
            name: `Batch Test Product ${i}`,
            subscriptionName: `Plan ${i}`,
            creator: testAccount.addr.toString(),
            ...DEFAULT_PRODUCT_PARAMS,
          });
          productIds.push(result.productId);
        }

        // Create subscriber and subscribe to some products
        const subscriber = await generateAccount({ initialFunds: algo(5) });

        // Subscribe to first two products
        await core.subscribe(config, {
          productId: productIds[0],
          subscriber: subscriber.addr.toString(),
        });

        await core.subscribe(config, {
          productId: productIds[1],
          subscriber: subscriber.addr.toString(),
        });

        // Batch fetch subscriptions
        const subscriptions = await core.getSubscriptionBatch(
          config,
          productIds,
          subscriber.addr.toString(),
        );

        expect(subscriptions.size).toBe(3);
        expect(subscriptions.get(productIds[0])).toBeDefined();
        expect(subscriptions.get(productIds[1])).toBeDefined();
        expect(subscriptions.get(productIds[2])).toBeNull();
      },
      SLOW_TIMEOUT,
    );

    it(
      "should batch check active subscriber status",
      async () => {
        const { testAccount, generateAccount } = fixture.context;
        const config = createTestConfig({
          algorand: fixture.context.algorand,
          defaultAccount: testAccount,
        });

        // Create locker
        await core.getOrCreateLocker(
          config,
          testAccount.addr.toString(),
          LockerType.CREATOR,
        );

        // Create multiple products
        const productIds: bigint[] = [];
        for (let i = 0; i < 3; i++) {
          const result = await core.createProduct(config, {
            name: `Active Check Product ${i}`,
            subscriptionName: `Plan ${i}`,
            creator: testAccount.addr.toString(),
            ...DEFAULT_PRODUCT_PARAMS,
          });
          productIds.push(result.productId);
        }

        // Create subscriber and subscribe to first product only
        const subscriber = await generateAccount({ initialFunds: algo(5) });

        await core.subscribe(config, {
          productId: productIds[0],
          subscriber: subscriber.addr.toString(),
        });

        // Batch check active status
        const activeStatuses = await core.isActiveSubscriberBatch(
          config,
          productIds,
          subscriber.addr.toString(),
        );

        expect(activeStatuses.size).toBe(3);
        expect(activeStatuses.get(productIds[0])).toBe(true);
        expect(activeStatuses.get(productIds[1])).toBe(false);
        expect(activeStatuses.get(productIds[2])).toBe(false);
      },
      SLOW_TIMEOUT,
    );
  });

  describe("Error Handling", () => {
    it(
      "should handle invalid product ID",
      async () => {
        const { testAccount } = fixture.context;
        const config = createTestConfig({
          algorand: fixture.context.algorand,
          defaultAccount: testAccount,
        });
        const invalidProductId = BigInt(999999);

        await expect(
          core.getProductState(config, invalidProductId),
        ).rejects.toThrow();
      },
      FAST_TIMEOUT,
    );

    it(
      "should handle invalid subscriber address",
      async () => {
        const { testAccount } = fixture.context;
        const config = createTestConfig({
          algorand: fixture.context.algorand,
          defaultAccount: testAccount,
        });

        const productResult = await core.createProduct(config, {
          name: "Error Test Product",
          subscriptionName: "Basic",
          creator: testAccount.addr.toString(),
          ...DEFAULT_PRODUCT_PARAMS,
        });

        await expect(
          core.subscribe(config, {
            productId: productResult.productId,
            subscriber: "INVALID_ADDRESS",
          }),
        ).rejects.toThrow();
      },
      SLOW_TIMEOUT,
    );
  });
});
