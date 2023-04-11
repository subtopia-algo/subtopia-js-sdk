import { Algodv2, decodeAddress } from "algosdk";
import {
  getLocker,
  SubscriptionType,
  SubtopiaAdminClient,
  SubtopiaClient,
} from "../src/index";
import { it, describe, expect } from "vitest";
import { sandbox } from "beaker-ts";

import { SMR } from "../src/contracts/smr_client";
import {
  getRandomAccount,
  filterAsync,
  generateRandomAsset,
  getRandomElement,
} from "./utils";
import { normalizePrice, rekeyLocker } from "../src/common/utils";
import { SandboxAccount } from "beaker-ts/dist/types/sandbox/accounts";
import {
  DiscountType,
  PriceNormalizationType,
  SubscriptionExpirationType,
} from "../src/common/enums";
import { assert } from "console";

const TIME_BASED_EXPIRATION_TYPES = [
  SubscriptionExpirationType.MONTHLY,
  SubscriptionExpirationType.QUARTERLY,
  SubscriptionExpirationType.SEMI_ANNUAL,
  SubscriptionExpirationType.ANNUAL,
];

const algodClient = new Algodv2("a".repeat(64), "http://localhost", "4001");
const accounts = await sandbox.getAccounts();
const bigBalanceAccounts = await filterAsync(accounts, async (account) => {
  const { amount } = await algodClient.accountInformation(account.addr).do();
  return amount > 1e6 * 100e6;
});

const adminAccount = bigBalanceAccounts.pop() as SandboxAccount;
const dummyRegistry = new SMR({
  client: algodClient,
  sender: adminAccount.addr,
  signer: adminAccount.signer,
});

async function setupDummyRegistry() {
  const { appId: dummyRegistryId, appAddress } =
    await dummyRegistry.createApplication({
      extraPages: 2,
    });
  const dummyRegistryAddress = await SubtopiaAdminClient.getRegistryAddress({
    client: algodClient,
    user: { address: adminAccount.addr, signer: adminAccount.signer },
    smrID: dummyRegistryId,
  });
  expect(dummyRegistryAddress).toBe(appAddress);
  return { dummyRegistryId, dummyRegistryAddress };
}

describe("subtopia", () => {
  it(
    "should correctly add infrastructure",
    async () => {
      // Setup
      const { dummyRegistryId } = await setupDummyRegistry();

      // Test
      const result = await SubtopiaAdminClient.addInfrastructure({
        creator: { address: adminAccount.addr, signer: adminAccount.signer },
        smrID: dummyRegistryId,
        name: "Cool infrastructure",
        price: 1,
        client: algodClient,
        subType: SubscriptionType.UNLIMITED,
        maxSubs: 0,
        coinID: 0,
      });

      const infrastructureID = Number(result.returnValue);

      const content = await SubtopiaClient.getInfrastructureState(
        algodClient,
        infrastructureID
      );

      const contentWithNoNormalization =
        await SubtopiaClient.getInfrastructureState(
          algodClient,
          infrastructureID,
          false
        );

      // Assert
      expect(content.price).toBe(1);
      expect(contentWithNoNormalization.price).toBe(1 * 1e6);
      expect(result).toBeDefined();
      expect(result.txID).toBeDefined();
    },
    { timeout: 1e6 }
  );

  it(
    "should correctly add infrastructure with already rekeyed locker",
    async () => {
      // Setup
      const { dummyRegistryId, dummyRegistryAddress } =
        await setupDummyRegistry();

      const locker = await getLocker(
        algodClient,
        adminAccount.addr,
        dummyRegistryAddress
      );

      await rekeyLocker({
        client: algodClient,
        locker: locker.lsig,
        creatorAddress: adminAccount.addr,
        creatorSigner: adminAccount.signer,
        registryAddress: dummyRegistryAddress,
        registrySigner: adminAccount.signer,
        rekeyToAddress: dummyRegistryAddress,
      });

      // Test
      const result = await SubtopiaAdminClient.addInfrastructure({
        creator: { address: adminAccount.addr, signer: adminAccount.signer },
        smrID: dummyRegistryId,
        name: "Cool infrastructure",
        price: 1,
        client: algodClient,
        subType: SubscriptionType.UNLIMITED,
        maxSubs: 0,
        coinID: 0,
      });

      const infrastructureID = Number(result.returnValue);

      const content = await SubtopiaClient.getInfrastructureState(
        algodClient,
        infrastructureID
      );

      const contentWithNoNormalization =
        await SubtopiaClient.getInfrastructureState(
          algodClient,
          infrastructureID,
          false
        );

      // Assert
      expect(content.price).toBe(1);
      expect(contentWithNoNormalization.price).toBe(1 * 1e6);
      expect(result).toBeDefined();
      expect(result.txID).toBeDefined();
    },
    { timeout: 1e6 }
  );

  it.each([
    [SubscriptionExpirationType.UNLIMITED, DiscountType.FIXED, 1],
    [SubscriptionExpirationType.MONTHLY, DiscountType.FIXED, 2],
    [SubscriptionExpirationType.QUARTERLY, DiscountType.FIXED, 3],
    [SubscriptionExpirationType.SEMI_ANNUAL, DiscountType.FIXED, 4],
    [SubscriptionExpirationType.ANNUAL, DiscountType.FIXED, 10],
    [SubscriptionExpirationType.UNLIMITED, DiscountType.PERCENTAGE, 1],
    [SubscriptionExpirationType.MONTHLY, DiscountType.PERCENTAGE, 2],
    [SubscriptionExpirationType.QUARTERLY, DiscountType.PERCENTAGE, 3],
    [SubscriptionExpirationType.SEMI_ANNUAL, DiscountType.PERCENTAGE, 4],
    [SubscriptionExpirationType.ANNUAL, DiscountType.PERCENTAGE, 10],
  ])(
    "should correctly create discount of type %i, %i and %i on SMI",
    async (expirationType, discountType, discountValue) => {
      // Setup
      const { dummyRegistryId } = await setupDummyRegistry();
      const randomAsset = await generateRandomAsset(algodClient, adminAccount);

      const response = await SubtopiaAdminClient.addInfrastructure({
        creator: { address: adminAccount.addr, signer: adminAccount.signer },
        smrID: dummyRegistryId,
        name: "Cool infrastructure",
        price: 1,
        client: algodClient,
        subType:
          expirationType === SubscriptionExpirationType.UNLIMITED
            ? SubscriptionType.UNLIMITED
            : SubscriptionType.TIME_BASED,
        maxSubs: 0,
        coinID: randomAsset.index,
      });
      const infrastructureID = Number(response.returnValue);

      // Test
      const discount = await SubtopiaClient.createDiscount(
        {
          creator: { address: adminAccount.addr, signer: adminAccount.signer },
          smiID: infrastructureID,
          smrID: dummyRegistryId,
          discount: {
            expirationType: expirationType,
            discountType: discountType,
            discountValue: discountValue,
          },
        },
        { client: algodClient }
      );

      // Assert
      expect(discount).toBeDefined();
      expect(discount.txID).toBeDefined();

      const discountRecord = await SubtopiaClient.getDiscountRecordForType(
        algodClient,
        infrastructureID,
        expirationType
      );

      const smiState = await SubtopiaClient.getInfrastructureState(
        algodClient,
        infrastructureID
      );
      assert(smiState.discounts[0] === discountRecord);
      assert(smiState.discounts.length === 1);

      expect(discountRecord).toBeDefined();
      expect(discountRecord.discountType).toBe(discountType);
      expect(discountRecord.discountValue).toBe(
        discountType === DiscountType.FIXED
          ? normalizePrice(
              discountValue,
              randomAsset.decimals,
              PriceNormalizationType.RAW
            )
          : discountValue
      );
      expect(discountRecord.expirationType).toBe(expirationType);

      await SubtopiaClient.deleteDiscount(
        {
          creator: { address: adminAccount.addr, signer: adminAccount.signer },
          smiID: infrastructureID,
          smrID: dummyRegistryId,
          expirationType: expirationType,
        },
        { client: algodClient }
      );

      // Should be deleted
      await expect(
        SubtopiaClient.getDiscountRecordForType(
          algodClient,
          infrastructureID,
          expirationType
        )
      ).rejects.toThrowError();

      const postDeleteSmiState = await SubtopiaClient.getInfrastructureState(
        algodClient,
        infrastructureID
      );
      assert(postDeleteSmiState.discounts.length === 0);
    },
    { timeout: 1e6 }
  );

  // it.each([
  //   // [SubscriptionExpirationType.UNLIMITED, undefined, 0],
  //   // [SubscriptionExpirationType.UNLIMITED, DiscountType.FIXED, 1],
  //   [SubscriptionExpirationType.MONTHLY, DiscountType.FIXED, 2],
  //   // [SubscriptionExpirationType.QUARTERLY, DiscountType.FIXED, 3],
  //   // [SubscriptionExpirationType.SEMI_ANNUAL, DiscountType.FIXED, 4],
  //   // [SubscriptionExpirationType.ANNUAL, DiscountType.FIXED, 10],
  //   // [SubscriptionExpirationType.UNLIMITED, DiscountType.PERCENTAGE, 1],
  //   // [SubscriptionExpirationType.MONTHLY, DiscountType.PERCENTAGE, 2],
  //   // [SubscriptionExpirationType.QUARTERLY, DiscountType.PERCENTAGE, 3],
  //   // [SubscriptionExpirationType.SEMI_ANNUAL, DiscountType.PERCENTAGE, 4],
  //   // [SubscriptionExpirationType.ANNUAL, DiscountType.PERCENTAGE, 10],
  // ]
  it(
    "should correctly purchase subscription with algo and discount of type %i, %i and %i",
    async () =>
      // expirationType: SubscriptionExpirationType,
      // discountType: DiscountType | undefined,
      // discountValue: number
      {
        const expirationType = SubscriptionExpirationType.MONTHLY;
        const discountType = DiscountType.FIXED;
        const discountValue = 2;
        // Setup
        const { dummyRegistryId } = await setupDummyRegistry();

        const response = await SubtopiaAdminClient.addInfrastructure({
          creator: { address: adminAccount.addr, signer: adminAccount.signer },
          smrID: dummyRegistryId,
          name: "Cool infrastructure",
          price: 20,
          client: algodClient,
          subType:
            expirationType === SubscriptionExpirationType.UNLIMITED
              ? SubscriptionType.UNLIMITED
              : SubscriptionType.TIME_BASED,
          maxSubs: 0,
          coinID: 0,
        });

        const infrastructureID = Number(response.returnValue);

        // Test
        const subscriber = await getRandomAccount(
          algodClient,
          adminAccount.addr,
          adminAccount.signer
        );

        if (discountType !== undefined) {
          await SubtopiaClient.createDiscount(
            {
              creator: {
                address: adminAccount.addr,
                signer: adminAccount.signer,
              },
              smiID: infrastructureID,
              smrID: dummyRegistryId,
              discount: {
                expirationType: expirationType,
                discountType: discountType,
                discountValue: discountValue,
              },
            },
            { client: algodClient }
          );
        }

        const result = await SubtopiaClient.subscribe(
          {
            subscriber: {
              address: subscriber.address,
              signer: subscriber.signer,
            },
            smiID: infrastructureID,
            smrID: dummyRegistryId,
            expirationType: expirationType,
          },
          {
            client: algodClient,
          }
        );

        const claimResult = await SubtopiaClient.claimSubscriptionPass(
          {
            smiID: infrastructureID,
            subID: Number(result.returnValue),
            subscriber: {
              address: subscriber.address,
              signer: subscriber.signer,
            },
          },
          {
            client: algodClient,
          }
        );

        const boxContent = await SubtopiaClient.getSubscriptionRecordForAccount(
          algodClient,
          subscriber.address,
          infrastructureID
        );

        // Assert
        expect(boxContent.subID).toBe(Number(result.returnValue));
        expect(result).toBeDefined();
        expect(result.txID).toBeDefined();
        expect(result.returnValue).toBeGreaterThan(0);
        expect(claimResult).toBeDefined();

        const balance = algodClient.accountAssetInformation(
          subscriber.address,
          Number(result.returnValue)
        );
        expect(balance).toBeDefined();
        expect(balance["assetID"]).toBe(Number(result.returnValue));

        await SubtopiaClient.unsubscribe(
          {
            smiID: infrastructureID,
            subscriber: {
              address: subscriber.address,
              signer: subscriber.signer,
            },
          },
          {
            client: algodClient,
          }
        );

        if (discountType !== undefined) {
          await SubtopiaClient.deleteDiscount(
            {
              creator: {
                address: adminAccount.addr,
                signer: adminAccount.signer,
              },
              smiID: infrastructureID,
              smrID: dummyRegistryId,
              expirationType: expirationType,
            },
            { client: algodClient }
          );
        }
      },
    { timeout: 1e6 }
  );

  it.each([
    [SubscriptionExpirationType.UNLIMITED, undefined, 0],
    [SubscriptionExpirationType.UNLIMITED, DiscountType.FIXED, 1],
    [SubscriptionExpirationType.MONTHLY, DiscountType.FIXED, 2],
    [SubscriptionExpirationType.QUARTERLY, DiscountType.FIXED, 3],
    [SubscriptionExpirationType.SEMI_ANNUAL, DiscountType.FIXED, 4],
    [SubscriptionExpirationType.ANNUAL, DiscountType.FIXED, 10],
    [SubscriptionExpirationType.UNLIMITED, DiscountType.PERCENTAGE, 1],
    [SubscriptionExpirationType.MONTHLY, DiscountType.PERCENTAGE, 2],
    [SubscriptionExpirationType.QUARTERLY, DiscountType.PERCENTAGE, 3],
    [SubscriptionExpirationType.SEMI_ANNUAL, DiscountType.PERCENTAGE, 4],
    [SubscriptionExpirationType.ANNUAL, DiscountType.PERCENTAGE, 10],
  ])(
    "should correctly purchase subscription with custom ASA and discount of type %i %i %i",
    async (expirationType, discountType, discountValue) => {
      // Setup
      const { dummyRegistryId } = await setupDummyRegistry();

      const randomAsset = await generateRandomAsset(algodClient, adminAccount);
      const randomSubType = getRandomElement([
        SubscriptionType.TIME_BASED,
        SubscriptionType.UNLIMITED,
      ]);
      const response = await SubtopiaAdminClient.addInfrastructure({
        creator: { address: adminAccount.addr, signer: adminAccount.signer },
        smrID: dummyRegistryId,
        name: "Cool infrastructure",
        price: 1,
        client: algodClient,
        coinID: randomAsset.index,
        subType: randomSubType,
        maxSubs: 0,
      });

      const infrastructureID = Number(response.returnValue);

      // Test
      const subscriber = await getRandomAccount(
        algodClient,
        adminAccount.addr,
        adminAccount.signer,
        randomAsset
      );

      if (discountType !== undefined) {
        const response = await SubtopiaClient.createDiscount(
          {
            creator: {
              address: adminAccount.addr,
              signer: adminAccount.signer,
            },
            smiID: infrastructureID,
            smrID: dummyRegistryId,
            discount: {
              expirationType: expirationType,
              discountType: discountType,
              discountValue: discountValue,
            },
          },
          { client: algodClient }
        );
        console.log(response);
      }

      const result = await SubtopiaClient.subscribe(
        {
          subscriber: {
            address: subscriber.address,
            signer: subscriber.signer,
          },
          smiID: infrastructureID,
          smrID: dummyRegistryId,
          expirationType: expirationType,
        },
        {
          client: algodClient,
        }
      );

      const claimResult = await SubtopiaClient.claimSubscriptionPass(
        {
          smiID: infrastructureID,
          subID: Number(result.returnValue),
          subscriber: {
            address: subscriber.address,
            signer: subscriber.signer,
          },
        },
        {
          client: algodClient,
        }
      );

      const boxContent = await SubtopiaClient.getSubscriptionRecordForAccount(
        algodClient,
        subscriber.address,
        infrastructureID
      );

      // Assert
      expect(boxContent.subID).toBe(Number(result.returnValue));
      expect(result).toBeDefined();
      expect(result.txID).toBeDefined();
      expect(result.returnValue).toBeGreaterThan(0);
      expect(claimResult).toBeDefined();

      const balance = algodClient.accountAssetInformation(
        subscriber.address,
        Number(result.returnValue)
      );
      expect(balance).toBeDefined();
      expect(balance["assetID"]).toBe(Number(result.returnValue));
    },
    { timeout: 1e6 }
  );

  it(
    "should correctly claim revenue with algo",
    async () => {
      // Setup
      const { dummyRegistryId } = await setupDummyRegistry();

      const randomSubType = getRandomElement([
        SubscriptionType.TIME_BASED,
        SubscriptionType.UNLIMITED,
      ]);

      const response = await SubtopiaAdminClient.addInfrastructure({
        creator: { address: adminAccount.addr, signer: adminAccount.signer },
        smrID: dummyRegistryId,
        name: "Cool infrastructure",
        price: 1,
        client: algodClient,
        subType: randomSubType,
        maxSubs: 0,
        coinID: 0,
      });

      const infrastructureID = Number(response.returnValue);

      // Test
      const subscriber = await getRandomAccount(
        algodClient,
        adminAccount.addr,
        adminAccount.signer
      );

      const randomExpirationType =
        randomSubType === SubscriptionType.TIME_BASED
          ? getRandomElement(TIME_BASED_EXPIRATION_TYPES)
          : undefined;

      await SubtopiaClient.subscribe(
        {
          subscriber: {
            address: subscriber.address,
            signer: subscriber.signer,
          },
          smiID: infrastructureID,
          smrID: dummyRegistryId,
          expirationType: randomExpirationType,
        },
        {
          client: algodClient,
        }
      );

      const claimResponse = await SubtopiaClient.claimRevenue(
        {
          user: {
            address: adminAccount.addr,
            signer: adminAccount.signer,
          },
          smrID: dummyRegistryId,
        },
        {
          client: algodClient,
        }
      );

      // Assert
      expect(claimResponse).toBeDefined();
    },
    { timeout: 1e6 }
  );

  it.each([[SubscriptionType.UNLIMITED], [SubscriptionType.TIME_BASED]])(
    "should correctly delete SMI of type %i with N subscribers before deleting SMI",
    async (randomSubType) => {
      // Setup
      const { dummyRegistryId } = await setupDummyRegistry();

      const addResponse = await SubtopiaAdminClient.addInfrastructure({
        creator: { address: adminAccount.addr, signer: adminAccount.signer },
        smrID: dummyRegistryId,
        name: "Cool infrastructure",
        price: 1,
        client: algodClient,
        subType: randomSubType,
        maxSubs: 0,
        coinID: 0,
      });

      const infrastructureID = Number(addResponse.returnValue);

      // Test
      // Create 50 subscribers
      for (let index = 0; index < 50; index++) {
        const subscriber = await getRandomAccount(
          algodClient,
          adminAccount.addr,
          adminAccount.signer
        );

        const randomExpirationType =
          randomSubType === SubscriptionType.TIME_BASED
            ? getRandomElement(TIME_BASED_EXPIRATION_TYPES)
            : undefined;

        const result = await SubtopiaClient.subscribe(
          {
            subscriber: {
              address: subscriber.address,
              signer: subscriber.signer,
            },
            smiID: infrastructureID,
            smrID: dummyRegistryId,
            expirationType: randomExpirationType,
          },
          {
            client: algodClient,
          }
        );

        const claimResult = await SubtopiaClient.claimSubscriptionPass(
          {
            smiID: infrastructureID,
            subID: Number(result.returnValue),
            subscriber: {
              address: subscriber.address,
              signer: subscriber.signer,
            },
          },
          {
            client: algodClient,
          }
        );

        const boxContent = await SubtopiaClient.getSubscriptionRecordForAccount(
          algodClient,
          subscriber.address,
          infrastructureID
        );

        // Assert
        expect(boxContent.subID).toBe(Number(result.returnValue));
        expect(result).toBeDefined();
        expect(result.txID).toBeDefined();
        expect(result.returnValue).toBeGreaterThan(0);
        expect(claimResult).toBeDefined();

        const balance = algodClient.accountAssetInformation(
          subscriber.address,
          Number(result.returnValue)
        );
        expect(balance).toBeDefined();
        expect(balance["assetID"]).toBe(Number(result.returnValue));
      }

      const deleteResponse = await SubtopiaClient.deleteSubscription(
        {
          smiID: infrastructureID,
          smrID: dummyRegistryId,
          user: {
            address: adminAccount.addr,
            signer: adminAccount.signer,
          },
        },
        {
          client: algodClient,
        }
      );

      expect(deleteResponse.txID).toBeDefined();

      // Should be deleted
      await expect(
        SubtopiaClient.getInfrastructureState(algodClient, infrastructureID)
      ).rejects.toThrowError();
    },
    { timeout: 1e6 }
  );

  it(
    "should correctly transfer SMI to new owner",
    async () => {
      // Setup
      const { dummyRegistryId } = await setupDummyRegistry();

      const randomSubType = getRandomElement([
        SubscriptionType.TIME_BASED,
        SubscriptionType.UNLIMITED,
      ]);
      const response = await SubtopiaAdminClient.addInfrastructure({
        creator: { address: adminAccount.addr, signer: adminAccount.signer },
        smrID: dummyRegistryId,
        name: "Cool infrastructure",
        price: 1,
        client: algodClient,
        subType: randomSubType,
        maxSubs: 0,
        coinID: 0,
      });
      const infrastructureID = Number(response.returnValue);

      const oldOwner = await getRandomAccount(
        algodClient,
        adminAccount.addr,
        adminAccount.signer
      );

      const randomExpirationType =
        randomSubType === SubscriptionType.TIME_BASED
          ? getRandomElement(TIME_BASED_EXPIRATION_TYPES)
          : undefined;
      const result = await SubtopiaClient.subscribe(
        {
          subscriber: { address: oldOwner.address, signer: oldOwner.signer },
          smiID: infrastructureID,
          smrID: dummyRegistryId,
          expirationType: randomExpirationType,
        },
        {
          client: algodClient,
        }
      );

      // Test
      const newOwner = await getRandomAccount(
        algodClient,
        adminAccount.addr,
        adminAccount.signer
      );

      const oldBoxBeforeTransfer = await algodClient
        .getApplicationBoxByName(
          infrastructureID,
          decodeAddress(oldOwner.address).publicKey
        )
        .do();

      const transferResult = await SubtopiaClient.transferSubscriptionPass(
        {
          newOwnerAddress: newOwner.address,
          oldOwner: {
            address: oldOwner.address,
            signer: oldOwner.signer,
          },
          smiID: infrastructureID,
          subID: Number(result.returnValue),
        },
        { client: algodClient }
      );

      // Assert
      await expect(
        algodClient
          .getApplicationBoxByName(
            infrastructureID,
            decodeAddress(oldOwner.address).publicKey
          )
          .do()
      ).rejects.toThrowError();
      const newBoxAfterTransfer = algodClient.getApplicationBoxByName(
        infrastructureID,
        decodeAddress(oldOwner.address).publicKey
      );
      expect(transferResult).toBeDefined();
      expect(oldBoxBeforeTransfer).toBeDefined();
      expect(newBoxAfterTransfer).toBeDefined();
    },
    { timeout: 1e6 }
  );

  it(
    "should correctly unsubscribe/delete purchased Subscription",
    async () => {
      // Setup
      const { dummyRegistryId } = await setupDummyRegistry();

      const response = await SubtopiaAdminClient.addInfrastructure({
        creator: { address: adminAccount.addr, signer: adminAccount.signer },
        smrID: dummyRegistryId,
        name: "Cool infrastructure",
        price: 1,
        client: algodClient,
        subType: SubscriptionType.UNLIMITED,
        maxSubs: 0,
        coinID: 0,
      });
      const infrastructureID = Number(response.returnValue);

      const subscriber = await getRandomAccount(
        algodClient,
        adminAccount.addr,
        adminAccount.signer
      );

      const randomExpirationType = getRandomElement(
        TIME_BASED_EXPIRATION_TYPES
      );
      const result = await SubtopiaClient.subscribe(
        {
          subscriber: {
            address: subscriber.address,
            signer: subscriber.signer,
          },
          smiID: infrastructureID,
          smrID: dummyRegistryId,
          expirationType: randomExpirationType,
        },
        {
          client: algodClient,
        }
      );

      // Test
      const boxContent = await SubtopiaClient.getSubscriptionRecordForAccount(
        algodClient,
        subscriber.address,
        infrastructureID
      );

      const deleteResult = await SubtopiaClient.unsubscribe(
        {
          subscriber: {
            address: subscriber.address,
            signer: subscriber.signer,
          },
          smiID: infrastructureID,
        },
        {
          client: algodClient,
        }
      );

      // Assert
      expect(boxContent.subID).toBe(Number(result.returnValue));
      expect(deleteResult.returnValue).toBe(result.returnValue);
      await expect(
        algodClient
          .getApplicationBoxByName(
            infrastructureID,
            decodeAddress(subscriber.address).publicKey
          )
          .do()
      ).rejects.toThrowError();
      expect(deleteResult).toBeDefined();
      expect(deleteResult.txID).toBeDefined();
    },
    { timeout: 1e6 }
  );

  it(
    "should correctly transfer SMI ownership to new creator and claim",
    async () => {
      // Setup
      const { dummyRegistryId } = await setupDummyRegistry();

      const response = await SubtopiaAdminClient.addInfrastructure({
        creator: { address: adminAccount.addr, signer: adminAccount.signer },
        smrID: dummyRegistryId,
        name: "Cool infrastructure",
        price: 1,
        client: algodClient,
        subType: SubscriptionType.UNLIMITED,
        maxSubs: 0,
        coinID: 0,
      });
      const infrastructureID = Number(response.returnValue);

      // Test
      const newOwner = await getRandomAccount(
        algodClient,
        adminAccount.addr,
        adminAccount.signer
      );

      const transferResult = await SubtopiaAdminClient.transferInfrastructure({
        client: algodClient,
        creator: { address: adminAccount.addr, signer: adminAccount.signer },
        newCreatorAddress: newOwner.address,
        smiID: infrastructureID,
        smrID: dummyRegistryId,
      });

      const boxContent =
        await SubtopiaAdminClient.getPendingTransferRecordForAccount(
          algodClient,
          newOwner.address,
          dummyRegistryId
        );

      await SubtopiaAdminClient.claimInfrastructure({
        client: algodClient,
        creator: { address: newOwner.address, signer: newOwner.signer },
        smiID: infrastructureID,
        smrID: dummyRegistryId,
      });

      // Assert
      const expectedLocker = await getLocker(
        algodClient,
        newOwner.address,
        dummyRegistry.appAddress
      );

      expect(boxContent).toBeDefined();
      expect(boxContent?.smiID).toBe(infrastructureID);
      expect(boxContent?.locker).toBe(expectedLocker.lsig.address());
      expect(
        await SubtopiaAdminClient.getPendingTransferRecordForAccount(
          algodClient,
          newOwner.address,
          dummyRegistryId
        )
      ).toBe(undefined);
      expect(transferResult.txID).toBeDefined();
    },
    { timeout: 1e6 }
  );

  it(
    "should correctly transfer SMI ownership to new creator and claim",
    async () => {
      // Setup
      const { dummyRegistryId } = await setupDummyRegistry();
      const randomAsset = await generateRandomAsset(algodClient, adminAccount);

      const response = await SubtopiaAdminClient.addInfrastructure({
        creator: { address: adminAccount.addr, signer: adminAccount.signer },
        smrID: dummyRegistryId,
        name: "Cool infrastructure",
        price: 1,
        client: algodClient,
        subType: SubscriptionType.UNLIMITED,
        maxSubs: 0,
        coinID: randomAsset.index,
      });
      const infrastructureID = Number(response.returnValue);

      // Test
      const newOwner = await getRandomAccount(
        algodClient,
        adminAccount.addr,
        adminAccount.signer
      );

      const transferResult = await SubtopiaAdminClient.transferInfrastructure({
        client: algodClient,
        creator: { address: adminAccount.addr, signer: adminAccount.signer },
        newCreatorAddress: newOwner.address,
        smiID: infrastructureID,
        smrID: dummyRegistryId,
      });

      const boxContent =
        await SubtopiaAdminClient.getPendingTransferRecordForAccount(
          algodClient,
          newOwner.address,
          dummyRegistryId
        );

      await SubtopiaAdminClient.claimInfrastructure({
        client: algodClient,
        creator: { address: newOwner.address, signer: newOwner.signer },
        smiID: infrastructureID,
        smrID: dummyRegistryId,
      });

      // Assert
      const expectedLocker = await getLocker(
        algodClient,
        newOwner.address,
        dummyRegistry.appAddress
      );

      expect(boxContent).toBeDefined();
      expect(boxContent?.smiID).toBe(infrastructureID);
      expect(boxContent?.locker).toBe(expectedLocker.lsig.address());
      expect(
        await SubtopiaAdminClient.getPendingTransferRecordForAccount(
          algodClient,
          newOwner.address,
          dummyRegistryId
        )
      ).toBe(undefined);
      expect(transferResult.txID).toBeDefined();
    },
    { timeout: 1e6 }
  );
});
