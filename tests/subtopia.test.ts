import {
  mnemonicToSecretKey,
  makeBasicAccountTransactionSigner,
  Account,
} from "algosdk";
import "dotenv/config";
import { optInAsset, optOutAsset } from "../src/index";
import { it, describe, expect, beforeAll, afterAll } from "vitest";

import { SubtopiaRegistryClient } from "../src/clients/SubtopiaRegistryClient";
import { SubtopiaClient } from "../src/clients/SubtopiaClient";
import {
  ChainType,
  LockerType,
  DurationType,
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

const algodClient = getAlgoClient({
  server: "https://testnet-api.algonode.cloud",
});

const dispenserAccount = mnemonicToSecretKey(
  process.env["TESTNET_SUBTOPIA_DISPENSER_MNEMONIC"] as string
);

const creatorAccount = mnemonicToSecretKey(
  process.env["TESTNET_SUBTOPIA_CREATOR_MNEMONIC"] as string
);
const creatorSignerAccount = transactionSignerAccount(
  makeBasicAccountTransactionSigner(creatorAccount),
  creatorAccount.addr
);

const bobTestAccount = mnemonicToSecretKey(
  process.env["TESTNET_SUBTOPIA_BOB_MNEMONIC"] as string
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
    "should correctly add product, create subscription, delete subscription and delete product",
    async () => {
      // Setup
      const subtopiaRegistryClient = await SubtopiaRegistryClient.init(
        algodClient,
        creatorSignerAccount,
        ChainType.TESTNET
      );

      let lockerID = await SubtopiaRegistryClient.getLocker({
        registryID: subtopiaRegistryClient.appID,
        algodClient: algodClient,
        ownerAddress: creatorAccount.addr,
      });
      if (lockerID === undefined) {
        const response = await subtopiaRegistryClient.createLocker({
          creator: creatorSignerAccount,
          lockerType: LockerType.CREATOR,
        });
        lockerID = response.lockerID;
      }

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
        duration: DurationType.UNLIMITED,
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

      await optInAsset({
        client: algodClient,
        account: subscriberSigner,
        assetID: subscribeResponse.subscriptionID,
      });

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
    },
    { timeout: 10e6 }
  );

  it(
    "should correctly add product, create discount, transfer product and delete discount",
    async () => {
      const subtopiaRegistryClient = await SubtopiaRegistryClient.init(
        algodClient,
        creatorSignerAccount,
        ChainType.TESTNET
      );

      const newOwner = bobTestAccount;

      let lockerID = await SubtopiaRegistryClient.getLocker({
        registryID: subtopiaRegistryClient.appID,
        algodClient: algodClient,
        ownerAddress: creatorAccount.addr,
      });
      if (lockerID === undefined) {
        const response = await subtopiaRegistryClient.createLocker({
          creator: creatorSignerAccount,
          lockerType: LockerType.CREATOR,
        });
        lockerID = response.lockerID;
      }

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
    },
    {
      timeout: 10e6,
    }
  );
});
