import { makeBasicAccountTransactionSigner } from "algosdk";
import "dotenv/config";
import {
  LOCKER_VERSION,
  PRODUCT_VERSION,
  SUBTOPIA_REGISTRY_ID,
  optInAsset,
  optOutAsset,
} from "../src/index";
import { it, describe, expect, beforeAll } from "vitest";

import { SubtopiaRegistryClient } from "../src/clients/SubtopiaRegistryClient";
import { SubtopiaClient } from "../src/clients/SubtopiaClient";
import {
  ChainType,
  LockerType,
  Duration,
  DiscountType,
  SubscriptionType,
} from "../src/enums";
import {
  algos,
  getAlgoClient,
  getAppGlobalState,
  transactionSignerAccount,
  getDefaultLocalNetConfig,
  getLocalNetDispenserAccount,
} from "@algorandfoundation/algokit-utils";
import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";
import { transferAsset } from "../src/utils";
import { generateRandomAsset, getRandomAccount } from "./utils";

const algodClient = getAlgoClient(getDefaultLocalNetConfig("algod"));

let LOCALNET_USDC_ASA_ID = -1;
const dispenserAccount = await getLocalNetDispenserAccount(algodClient);
const creatorAccount = await getRandomAccount(
  algodClient,
  dispenserAccount.addr,
  makeBasicAccountTransactionSigner(dispenserAccount)
);
const bobTestAccount = await getRandomAccount(
  algodClient,
  dispenserAccount.addr,
  makeBasicAccountTransactionSigner(dispenserAccount)
);

const creatorSignerAccount = transactionSignerAccount(
  makeBasicAccountTransactionSigner(creatorAccount),
  creatorAccount.addr
);

async function setupSubtopiaRegistryClient(
  signerAccount: TransactionSignerAccount
) {
  const subtopiaRegistryClient = await SubtopiaRegistryClient.init({
    algodClient: algodClient,
    creator: signerAccount,
    chainType: ChainType.LOCALNET,
  });

  let lockerID = await SubtopiaRegistryClient.getLocker({
    registryID: subtopiaRegistryClient.appID,
    algodClient: algodClient,
    ownerAddress: creatorAccount.addr,
    lockerType: LockerType.CREATOR,
  });

  if (!lockerID) {
    const response = await subtopiaRegistryClient.createLocker({
      creator: signerAccount,
      lockerType: LockerType.CREATOR,
    });
    lockerID = response.lockerID;
  }

  return { subtopiaRegistryClient, lockerID };
}

describe("subtopia", () => {
  beforeAll(async () => {
    const metadata = await generateRandomAsset(
      algodClient,
      creatorAccount,
      "USDC",
      1000000000,
      6
    );

    LOCALNET_USDC_ASA_ID = metadata.index;
  });

  it("should match latest precompiled versions of locker and product contracts", async () => {
    // Setup
    const { subtopiaRegistryClient } = await setupSubtopiaRegistryClient(
      creatorSignerAccount
    );

    // Test
    const productVersion = await subtopiaRegistryClient.getProductVersion();
    const lockerVersion = await subtopiaRegistryClient.getLockerVersion();

    // Assert
    expect(lockerVersion).toBe(LOCKER_VERSION);
    expect(productVersion).toBe(PRODUCT_VERSION);
  }, 10e6);

  it(
    "should manage product and subscription lifecycle correctly",
    async () => {
      // Setup
      const { subtopiaRegistryClient, lockerID } =
        await setupSubtopiaRegistryClient(creatorSignerAccount);

      // Test
      const response = await subtopiaRegistryClient.createProduct({
        productName: "Notflix",
        subscriptionName: "Premium",
        price: 1,
        subType: SubscriptionType.UNLIMITED,
        maxSubs: 0,
        coinID: 0,
        lockerID: lockerID,
      });

      expect(response.productID).toBeGreaterThan(0);

      const subscriberAccount = bobTestAccount;
      const subscriberSigner = transactionSignerAccount(
        makeBasicAccountTransactionSigner(subscriberAccount),
        subscriberAccount.addr
      );

      const productClient = await SubtopiaClient.init({
        algodClient: algodClient,
        productID: response.productID,
        creator: creatorSignerAccount,
        registryID: SUBTOPIA_REGISTRY_ID(ChainType.LOCALNET),
        chainType: ChainType.LOCALNET,
      });

      const subscribeResponse = await productClient.createSubscription({
        subscriber: subscriberSigner,
        duration: Duration.UNLIMITED,
      });

      const productClientGlobalState = await productClient.getAppState();
      expect(productClientGlobalState.totalSubs).toBe(1);

      expect(subscribeResponse.subscriptionID).toBeGreaterThan(0);

      const getSubscriptionResponse = await productClient.getSubscription({
        subscriberAddress: subscriberSigner.addr,
        algodClient: algodClient,
      });

      expect(getSubscriptionResponse.subID).toBe(
        subscribeResponse.subscriptionID
      );

      const isSubscriberResponse = await productClient.isSubscriber({
        subscriberAddress: subscriberSigner.addr,
      });

      expect(isSubscriberResponse).toBe(true);

      const claimResponse = await productClient.claimSubscription({
        subscriber: subscriberSigner,
        subscriptionID: subscribeResponse.subscriptionID,
      });

      expect(claimResponse.txID).toBeDefined();

      const transferTxnId = await productClient.transferSubscription({
        oldSubscriber: subscriberSigner,
        newSubscriberAddress: creatorSignerAccount.addr,
        subscriptionID: subscribeResponse.subscriptionID,
      });

      await optOutAsset({
        client: algodClient,
        account: subscriberSigner,
        assetID: subscribeResponse.subscriptionID,
      });

      expect(transferTxnId).toBeDefined();

      const deleteSubscriptionResponse = await productClient.deleteSubscription(
        {
          subscriber: creatorSignerAccount,
          subscriptionID: subscribeResponse.subscriptionID,
        }
      );

      expect(deleteSubscriptionResponse.txID).toBeDefined();

      const content = await getAppGlobalState(response.productID, algodClient);

      // Assert
      expect(content.price.value).toBe(algos(1).algos);

      const disableProductResponse = await productClient.disable();

      expect(disableProductResponse.txID).toBeDefined();

      const deleteProductResponse = await subtopiaRegistryClient.deleteProduct({
        productID: productClient.appID,
        lockerID: lockerID,
      });

      expect(deleteProductResponse.txID).toBeDefined();
    },
    { timeout: 10e6 }
  );

  it(
    "should handle product and discount operations correctly",
    async () => {
      const { subtopiaRegistryClient, lockerID } =
        await setupSubtopiaRegistryClient(creatorSignerAccount);

      const newOwner = bobTestAccount;

      // Test
      const response = await subtopiaRegistryClient.createProduct({
        productName: "Hooli",
        subscriptionName: "Pro",
        price: 1,
        subType: SubscriptionType.TIME_BASED,
        maxSubs: 0,
        coinID: 0,
        lockerID: lockerID,
      });

      expect(response.productID).toBeGreaterThan(0);

      const productClient = await SubtopiaClient.init({
        algodClient: algodClient,
        productID: response.productID,
        creator: creatorSignerAccount,
        registryID: SUBTOPIA_REGISTRY_ID(ChainType.LOCALNET),
        chainType: ChainType.LOCALNET,
      });
      const createDiscountResponse = await productClient.createDiscount({
        duration: Duration.MONTH.valueOf(),
        discountType: DiscountType.FIXED,
        discountValue: 1,
        expiresIn: 0,
      });

      expect(createDiscountResponse.txID).toBeDefined();

      const purchaseResponse = await productClient.createSubscription({
        subscriber: creatorSignerAccount,
        duration: Duration.MONTH,
      });
      expect(purchaseResponse.txID).toBeDefined();

      const productState = await productClient.getAppState();

      const deleteSubscriptionResponse = await productClient.deleteSubscription(
        {
          subscriber: creatorSignerAccount,
          subscriptionID: purchaseResponse.subscriptionID,
        }
      );
      expect(deleteSubscriptionResponse.txID).toBeDefined();

      expect(productState.discounts.length).toBe(1);
      expect(productState.discounts[0].duration).toBe(Duration.MONTH.valueOf());

      const getDiscountResponse = await productClient.getDiscount({
        duration: Duration.MONTH.valueOf(),
      });

      expect(getDiscountResponse.discountValue).toBe(1);

      const transferResponse = await subtopiaRegistryClient.transferProduct({
        productID: response.productID,
        newOwnerAddress: newOwner.addr,
      });

      expect(transferResponse.txID).toBeDefined();

      const newOwnerProductClient = await SubtopiaClient.init({
        algodClient: algodClient,
        productID: response.productID,
        creator: transactionSignerAccount(
          makeBasicAccountTransactionSigner(newOwner),
          newOwner.addr
        ),
        registryID: SUBTOPIA_REGISTRY_ID(ChainType.LOCALNET),
        chainType: ChainType.LOCALNET,
      });

      const deleteDiscountResponse = await newOwnerProductClient.deleteDiscount(
        {
          duration: Duration.MONTH.valueOf(),
        }
      );

      expect(deleteDiscountResponse.txID).toBeDefined();

      const disableProductResponse = await newOwnerProductClient.disable();

      expect(disableProductResponse.txID).toBeDefined();

      const newOwnerLockerID = await SubtopiaRegistryClient.getLocker({
        registryID: subtopiaRegistryClient.appID,
        algodClient: algodClient,
        ownerAddress: newOwner.addr,
        lockerType: LockerType.CREATOR,
      });

      expect(newOwnerLockerID).toBeGreaterThan(0);

      const newOwnerRegistryClient = await SubtopiaRegistryClient.init({
        algodClient: algodClient,
        creator: transactionSignerAccount(
          makeBasicAccountTransactionSigner(newOwner),
          newOwner.addr
        ),
        chainType: ChainType.LOCALNET,
      });

      const deleteProductResponse = await newOwnerRegistryClient.deleteProduct({
        productID: productClient.appID,
        lockerID: newOwnerLockerID as number,
      });

      expect(deleteProductResponse.txID).toBeDefined();
    },
    {
      timeout: 10e6,
    }
  );

  it(
    "should not withdraw platform fee for free subscription",
    async () => {
      // Setup
      const { subtopiaRegistryClient, lockerID } =
        await setupSubtopiaRegistryClient(creatorSignerAccount);

      // Create a new product with price 0
      const response = await subtopiaRegistryClient.createProduct({
        productName: "Freeflix",
        subscriptionName: "Free",
        price: 0,
        subType: SubscriptionType.UNLIMITED,
        maxSubs: 0,
        coinID: 0,
        lockerID: lockerID,
      });

      // Initialize a new SubtopiaClient
      const productClient = await SubtopiaClient.init({
        algodClient: algodClient,
        productID: response.productID,
        creator: creatorSignerAccount,
        registryID: SUBTOPIA_REGISTRY_ID(ChainType.LOCALNET),
        chainType: ChainType.LOCALNET,
      });

      // Subscribe a user to the product
      const subscriberSigner = transactionSignerAccount(
        makeBasicAccountTransactionSigner(bobTestAccount),
        bobTestAccount.addr
      );

      const subscribeResponse = await productClient.createSubscription({
        subscriber: subscriberSigner,
        duration: Duration.UNLIMITED,
      });

      expect(subscribeResponse.subscriptionID).toBeGreaterThan(0);
      expect(subscribeResponse.txID).toBeDefined();

      // Get the platform fee
      const platformFee = await productClient.getSubscriptionPlatformFee();

      // Assert that the platform fee is 0
      expect(platformFee).toBe(0);
    },
    {
      timeout: 10e6,
    }
  );

  it(
    "should handle time-based subscriptions with ASA correctly",
    async () => {
      // Setup
      const { subtopiaRegistryClient, lockerID } =
        await setupSubtopiaRegistryClient(creatorSignerAccount);

      // Create a new product with the ASA as the price
      const response = await subtopiaRegistryClient.createProduct({
        productName: "ASAFlix",
        subscriptionName: "Premium",
        price: 1,
        subType: SubscriptionType.TIME_BASED,
        maxSubs: 0,
        coinID: LOCALNET_USDC_ASA_ID,
        lockerID: lockerID,
      });

      // Initialize a new SubtopiaClient
      const productClient = await SubtopiaClient.init({
        algodClient: algodClient,
        productID: response.productID,
        creator: creatorSignerAccount,
        registryID: SUBTOPIA_REGISTRY_ID(ChainType.LOCALNET),
        chainType: ChainType.LOCALNET,
      });

      // OptIn USDC (if not already opted in)
      const subscriberSigner = transactionSignerAccount(
        makeBasicAccountTransactionSigner(bobTestAccount),
        bobTestAccount.addr
      );

      const accountInfo = await algodClient
        .accountInformation(subscriberSigner.addr)
        .do();

      const isOptedIn = Boolean(
        accountInfo["assets"].some(
          (asset: { "asset-id": number }) =>
            asset["asset-id"] === LOCALNET_USDC_ASA_ID
        )
      );

      if (!isOptedIn) {
        await optInAsset({
          client: algodClient,
          account: subscriberSigner,
          assetID: LOCALNET_USDC_ASA_ID,
        });
      }

      // Transfer some ASA to the subscriber
      await transferAsset(
        {
          sender: creatorSignerAccount,
          recipient: subscriberSigner.addr,
          assetID: LOCALNET_USDC_ASA_ID,
          amount: 1,
        },
        algodClient
      );

      const subscribeResponse = await productClient.createSubscription({
        subscriber: subscriberSigner,
        duration: Duration.MONTH,
      });

      expect(subscribeResponse.subscriptionID).toBeGreaterThan(0);
      expect(subscribeResponse.txID).toBeDefined();
    },
    {
      timeout: 10e6,
    }
  );

  it(
    "should return all subscribers for a product correctly",
    async () => {
      const { subtopiaRegistryClient, lockerID } =
        await setupSubtopiaRegistryClient(creatorSignerAccount);

      const productCreationResponse =
        await subtopiaRegistryClient.createProduct({
          productName: "Hooli",
          subscriptionName: "Pro",
          price: 10,
          subType: SubscriptionType.TIME_BASED,
          maxSubs: 0,
          coinID: 0,
          lockerID: lockerID,
        });

      expect(productCreationResponse.productID).toBeGreaterThan(0);

      const productClient = await SubtopiaClient.init({
        algodClient: algodClient,
        productID: productCreationResponse.productID,
        creator: creatorSignerAccount,
        registryID: SUBTOPIA_REGISTRY_ID(ChainType.LOCALNET),
        chainType: ChainType.LOCALNET,
      });

      const createdSubscribers: Array<string> = [];
      for (let i = 0; i < 100; i++) {
        const subscriberAccount = await getRandomAccount(
          algodClient,
          dispenserAccount.addr,
          makeBasicAccountTransactionSigner(dispenserAccount)
        );
        createdSubscribers.push(subscriberAccount.addr);
        const subscriberSigner = transactionSignerAccount(
          makeBasicAccountTransactionSigner(subscriberAccount),
          subscriberAccount.addr
        );

        const subscribeResponse = await productClient.createSubscription({
          subscriber: subscriberSigner,
          duration: Duration.MONTH,
        });
        expect(subscribeResponse.txID).toBeDefined();
        console.log(`Created subscriber ${i + 1} of 100`);
      }

      const subscribers = await productClient.getSubscribers();
      subscribers.forEach((subscriber) => {
        expect(createdSubscribers).toContain(subscriber.address);
      });
    },
    {
      timeout: 10e6,
    }
  );
});
