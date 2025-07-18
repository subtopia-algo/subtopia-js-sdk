import { describe, it, expect, beforeEach } from "vitest";
import { algo } from "@algorandfoundation/algokit-utils";
import { algorandFixture } from "@algorandfoundation/algokit-utils/testing";
import * as core from "../../src/core";
import { LockerType } from "../../src/core/constants";
import {
  createTestConfig,
  DEFAULT_PRODUCT_PARAMS,
  SLOW_TIMEOUT,
} from "../setup";

const fixture = algorandFixture();

describe("Full Product Lifecycle Integration", () => {
  beforeEach(fixture.newScope, SLOW_TIMEOUT);

  it(
    "should complete full product and subscription lifecycle",
    async () => {
      const { algorand, testAccount, generateAccount } = fixture.context;
      const config = createTestConfig({
        algorand,
        defaultAccount: testAccount,
      });

      // Step 1: Create locker
      const lockerInfo = await core.getOrCreateLocker(
        config,
        testAccount.addr.toString(),
        LockerType.CREATOR,
      );
      expect(lockerInfo.id).toBeGreaterThan(0n);

      // Step 2: Create product
      const productResult = await core.createProduct(config, {
        name: "Integration Test Product",
        subscriptionName: "Premium",
        creator: testAccount.addr.toString(),
        ...DEFAULT_PRODUCT_PARAMS,
      });
      expect(productResult.productId).toBeGreaterThan(0n);

      // Step 3: Get product state
      const productState = await core.getProductState(
        config,
        productResult.productId,
      );
      expect(productState.name).toBe("Integration Test Product");
      expect(productState.subscriptionName).toBe("Premium");
      expect(productState.manager).toBe(testAccount.addr.toString());

      // Step 4: Create subscribers
      const subscribers = await Promise.all([
        generateAccount({ initialFunds: algo(10) }),
        generateAccount({ initialFunds: algo(10) }),
      ]);

      // Step 5: Subscribe to product
      const subscriptions = await Promise.all(
        subscribers.map((subscriber) =>
          core.subscribe(config, {
            productId: productResult.productId,
            subscriber: subscriber.addr.toString(),
          }),
        ),
      );

      expect(subscriptions).toHaveLength(2);
      subscriptions.forEach((sub) => {
        expect(sub.subscriptionId).toBeGreaterThan(0n);
      });

      // Step 6: Check subscription status
      const isActive1 = await core.isActiveSubscriber(
        config,
        productResult.productId,
        subscribers[0].addr.toString(),
      );
      expect(isActive1).toBe(true);

      // Step 7: Get subscription details
      const subscription1 = await core.getSubscription(
        config,
        productResult.productId,
        subscribers[0].addr.toString(),
      );
      expect(subscription1.subscriber).toBe(subscribers[0].addr.toString());

      // Step 8: Disable and re-enable product
      const disableResult = await core.disableProduct(config, {
        productId: productResult.productId,
        manager: testAccount.addr.toString(),
      });
      expect(disableResult.txId).toBeDefined();

      const disabledState = await core.getProductState(
        config,
        productResult.productId,
      );
      expect(disabledState.lifecycle).toBe(1); // Disabled

      // Re-enable
      const enableResult = await core.enableProduct(config, {
        productId: productResult.productId,
        manager: testAccount.addr.toString(),
      });
      expect(enableResult.txId).toBeDefined();

      const enabledState = await core.getProductState(
        config,
        productResult.productId,
      );
      expect(enabledState.lifecycle).toBe(0); // Enabled

      // Step 9: Transfer subscription
      const newSubscriber = await generateAccount({ initialFunds: algo(10) });
      const transferResult = await core.transferSubscription(config, {
        productId: productResult.productId,
        currentSubscriber: subscribers[0].addr.toString(),
        newSubscriber: newSubscriber.addr.toString(),
        subscriptionId: subscriptions[0].subscriptionId,
      });
      expect(transferResult.txId).toBeDefined();

      // Step 10: Verify transfer
      const isOldActive = await core.isActiveSubscriber(
        config,
        productResult.productId,
        subscribers[0].addr.toString(),
      );
      const isNewActive = await core.isActiveSubscriber(
        config,
        productResult.productId,
        newSubscriber.addr.toString(),
      );
      expect(isOldActive).toBe(false);
      expect(isNewActive).toBe(true);

      // Step 11: Delete subscription
      const deleteResult = await core.deleteSubscription(config, {
        productId: productResult.productId,
        subscriber: subscribers[1].addr.toString(),
        subscriptionId: subscriptions[1].subscriptionId,
      });
      expect(deleteResult.txId).toBeDefined();

      // Step 12: Transfer product ownership
      const newManager = await generateAccount({ initialFunds: algo(5) });
      const transferProductResult = await core.transferProduct(config, {
        productId: productResult.productId,
        currentOwner: testAccount.addr.toString(),
        newOwner: newManager.addr.toString(),
      });
      expect(transferProductResult.txId).toBeDefined();

      // Verify transfer
      const finalState = await core.getProductState(
        config,
        productResult.productId,
      );
      expect(finalState.manager).toBe(newManager.addr.toString());
    },
    SLOW_TIMEOUT * 4,
  );

  it(
    "should handle errors gracefully in integration scenarios",
    async () => {
      const { algorand, testAccount, generateAccount } = fixture.context;
      const config = createTestConfig({
        algorand,
        defaultAccount: testAccount,
      });

      // Create product
      await core.getOrCreateLocker(
        config,
        testAccount.addr.toString(),
        LockerType.CREATOR,
      );
      const productResult = await core.createProduct(config, {
        name: "Error Test Product",
        subscriptionName: "Basic",
        creator: testAccount.addr.toString(),
        ...DEFAULT_PRODUCT_PARAMS,
      });

      // Try to subscribe with insufficient funds
      const poorSubscriber = await generateAccount({
        initialFunds: algo(0.1),
      }); // Not enough for subscription
      await expect(
        core.subscribe(config, {
          productId: productResult.productId,
          subscriber: poorSubscriber.addr.toString(),
        }),
      ).rejects.toThrow();

      // Try to subscribe twice (should fail)
      const subscriber = await generateAccount({ initialFunds: algo(5) });
      await core.subscribe(config, {
        productId: productResult.productId,
        subscriber: subscriber.addr.toString(),
      });

      // Second subscription should fail
      await expect(
        core.subscribe(config, {
          productId: productResult.productId,
          subscriber: subscriber.addr.toString(),
        }),
      ).rejects.toThrow();

      // Test invalid operations
      await expect(
        core.claimSubscription(config, {
          productId: productResult.productId,
          subscriber: "INVALID_ADDRESS",
          subscriptionId: BigInt(999999),
        }),
      ).rejects.toThrow();
    },
    SLOW_TIMEOUT * 2,
  );
});
