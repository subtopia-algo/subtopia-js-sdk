import {
  mnemonicToSecretKey,
  makeBasicAccountTransactionSigner,
  Account,
} from "algosdk";
import "dotenv/config";
import { optOutAsset } from "../src/index";
import { it, describe, expect, beforeAll, afterAll } from "vitest";

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
  ensureFunded,
  getAlgoClient,
  getAppGlobalState,
  microAlgos,
  transactionSignerAccount,
  transferAlgos,
} from "@algorandfoundation/algokit-utils";
import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";

const CONFIG = {
  SERVER_URL: "https://testnet-api.algonode.cloud",
  DISPENSER_MNEMONIC: process.env[
    "TESTNET_SUBTOPIA_DISPENSER_MNEMONIC"
  ] as string,
  CREATOR_MNEMONIC: process.env["TESTNET_SUBTOPIA_CREATOR_MNEMONIC"] as string,
  BOB_MNEMONIC: process.env["TESTNET_SUBTOPIA_BOB_MNEMONIC"] as string,
};

const algodClient = getAlgoClient({
  server: CONFIG.SERVER_URL,
});

const dispenserAccount = mnemonicToSecretKey(CONFIG.DISPENSER_MNEMONIC);
const creatorAccount = mnemonicToSecretKey(CONFIG.CREATOR_MNEMONIC);
const bobTestAccount = mnemonicToSecretKey(CONFIG.BOB_MNEMONIC);

const creatorSignerAccount = transactionSignerAccount(
  makeBasicAccountTransactionSigner(creatorAccount),
  creatorAccount.addr
);

const refundTestnetAlgos = async (account: Account) => {
  const accountInfo = await algodClient.accountInformation(account.addr).do();

  const minWithdrawableAmount =
    accountInfo["amount"] - accountInfo["min-balance"] - algos(0.1).microAlgos;

  if (minWithdrawableAmount > 0) {
    await transferAlgos(
      {
        amount: microAlgos(minWithdrawableAmount),
        from: account,
        to: dispenserAccount,
      },
      algodClient
    );
  }
};

async function setupSubtopiaRegistryClient(
  signerAccount: TransactionSignerAccount
) {
  const subtopiaRegistryClient = await SubtopiaRegistryClient.init(
    algodClient,
    signerAccount,
    ChainType.TESTNET
  );

  let lockerID = await SubtopiaRegistryClient.getLocker({
    registryID: subtopiaRegistryClient.appID,
    algodClient: algodClient,
    ownerAddress: creatorAccount.addr,
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
    const dispenserInfo = await algodClient
      .accountInformation(dispenserAccount.addr)
      .do();

    const dispenserBalance = dispenserInfo["amount"];

    expect(dispenserBalance, "Dispenser must be funded").toBeGreaterThan(
      algos(10).microAlgos
    );

    await ensureFunded(
      {
        accountToFund: creatorAccount,
        fundingSource: dispenserAccount,
        minSpendingBalance: algos(5),
        minFundingIncrement: algos(5),
      },
      algodClient
    );

    await ensureFunded(
      {
        accountToFund: bobTestAccount,
        fundingSource: dispenserAccount,
        minSpendingBalance: algos(2),
      },
      algodClient
    );
  });

  afterAll(async () => {
    await refundTestnetAlgos(creatorAccount);
    await refundTestnetAlgos(bobTestAccount);
  });

  it(
    "should manage product and subscription lifecycle correctly",
    async () => {
      // Setup
      const { subtopiaRegistryClient, lockerID } =
        await setupSubtopiaRegistryClient(creatorSignerAccount);

      // Test
      const response = await subtopiaRegistryClient.createInfrastructure({
        productName: "Notflix",
        subscriptionName: "Premium",
        price: 1,
        subType: SubscriptionType.UNLIMITED,
        maxSubs: 0,
        coinID: 0,
        lockerID: lockerID,
      });

      expect(response.infrastructureID).toBeGreaterThan(0);

      const subscriberAccount = bobTestAccount;
      const subscriberSigner = transactionSignerAccount(
        makeBasicAccountTransactionSigner(subscriberAccount),
        subscriberAccount.addr
      );

      const productClient = await SubtopiaClient.init(
        algodClient,
        response.infrastructureID,
        creatorSignerAccount
      );

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

      const content = await getAppGlobalState(
        response.infrastructureID,
        algodClient
      );

      // Assert
      expect(content.price.value).toBe(algos(1).microAlgos);

      const disableProductResponse = await productClient.disable();

      expect(disableProductResponse.txID).toBeDefined();

      const deleteProductResponse =
        await subtopiaRegistryClient.deleteInfrastructure({
          infrastructureID: productClient.appID,
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
      const response = await subtopiaRegistryClient.createInfrastructure({
        productName: "Hooli",
        subscriptionName: "Pro",
        price: 1,
        subType: SubscriptionType.TIME_BASED,
        maxSubs: 0,
        coinID: 0,
        lockerID: lockerID,
      });

      expect(response.infrastructureID).toBeGreaterThan(0);

      const productClient = await SubtopiaClient.init(
        algodClient,
        response.infrastructureID,
        creatorSignerAccount
      );
      const createDiscountResponse = await productClient.createDiscount({
        duration: Duration.MONTH.valueOf(),
        discountType: DiscountType.FIXED,
        discountValue: 1e6,
        expiresIn: 0,
      });

      expect(createDiscountResponse.txID).toBeDefined();

      const productState = await productClient.getAppState();

      expect(productState.discounts.length).toBe(1);
      expect(productState.discounts[0].duration).toBe(Duration.MONTH.valueOf());

      const getDiscountResponse = await productClient.getDiscount({
        duration: Duration.MONTH.valueOf(),
      });

      expect(getDiscountResponse.discountValue).toBe(1e6);

      const transferResponse =
        await subtopiaRegistryClient.transferInfrastructure({
          infrastructureID: response.infrastructureID,
          newOwnerAddress: newOwner.addr,
        });

      expect(transferResponse.txID).toBeDefined();

      const newOwnerProductClient = await SubtopiaClient.init(
        algodClient,
        response.infrastructureID,
        transactionSignerAccount(
          makeBasicAccountTransactionSigner(newOwner),
          newOwner.addr
        )
      );

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
      });

      expect(newOwnerLockerID).toBeGreaterThan(0);

      const newOwnerRegistryClient = await SubtopiaRegistryClient.init(
        algodClient,
        transactionSignerAccount(
          makeBasicAccountTransactionSigner(newOwner),
          newOwner.addr
        ),
        ChainType.TESTNET
      );

      const deleteProductResponse =
        await newOwnerRegistryClient.deleteInfrastructure({
          infrastructureID: productClient.appID,
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

      // Create a new infrastructure with price 0
      const response = await subtopiaRegistryClient.createInfrastructure({
        productName: "Freeflix",
        subscriptionName: "Free",
        price: 0,
        subType: SubscriptionType.UNLIMITED,
        maxSubs: 0,
        coinID: 0,
        lockerID: lockerID,
      });

      // Initialize a new SubtopiaClient
      const productClient = await SubtopiaClient.init(
        algodClient,
        response.infrastructureID,
        creatorSignerAccount
      );

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
});
