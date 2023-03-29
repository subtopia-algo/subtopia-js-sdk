// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

import algosdk, {
  AtomicTransactionComposer,
  decodeAddress,
  encodeAddress,
  makeAssetTransferTxnWithSuggestedParamsFromObject,
  makePaymentTxnWithSuggestedParamsFromObject,
} from "algosdk";
import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";
import { ABIResult } from "beaker-ts";
import {
  loadApplicationState,
  getLocker,
  normalizePrice,
  optInAsset,
  getParamsWithFeeCount,
  rekeyLocker,
} from "./common/utils";
import { SMI, Subscription } from "./contracts/smi_client";
import { SMR } from "./contracts/smr_client";
import { getAssetByID } from "./common/utils";
import { PriceNormalizationType } from "./common/enums";
import {
  SMIClaimSubscriptionParams,
  SMIState,
  ChainMethodParams,
  SMISubscribeParams,
  SMITransferSubscriptionParams,
  SMIUnsubscribeParams,
  SubscriptionRecord,
  SMIMarkForDeletionParams,
  SMIDeleteSubscriptionParams,
  SMIClaimRevenueParams,
} from "./common/interfaces";
import {
  DEFAULT_AWAIT_ROUNDS,
  SUBTOPIA_REGISTRY_APP_ID,
} from "./common/constants";

export class SubtopiaClient {
  static async getInfrastructureState(
    client: AlgodClient,
    smiID: number,
    withPriceNormalization = true
  ) {
    const state = await loadApplicationState(client, smiID);
    const asset = await getAssetByID(client, Number(state["coin_id"]));

    /* eslint-disable prettier/prettier */
    return {
      smiID: smiID,
      manager: state["manager"],
      name: state["name"],
      price: withPriceNormalization
        ? normalizePrice(
            Number(state["price"]),
            asset.decimals,
            PriceNormalizationType.PRETTY
          )
        : Number(state["price"]),
      subType: state["sub_type"],
      maxSubs: state["max_subs"],
      activeSubs: state["active_subs"],
      lifecycle: state["lifecycle"],
      totalSubs: state["total_subs"],
      coinID: state["coin_id"],
      expiresIn: state["expires_in"],
    } as SMIState;
    /* eslint-enable prettier/prettier */
  }

  static async getSubscriptionRecordForAccount(
    client: AlgodClient,
    subscriberAddress: string,
    smiID = 0
  ): Promise<SubscriptionRecord> {
    const boxName = decodeAddress(subscriberAddress).publicKey;

    const response = await client.getApplicationBoxByName(smiID, boxName).do();
    const decoded = Subscription.decodeBytes(response.value);

    const expiresAt =
      Number(decoded["expires_at"]) === 0
        ? undefined
        : new Date(Number(decoded["expires_at"]) * 1000);

    const subscriptionRecord = {
      subID: Number(decoded["sub_id"]),
      subType: Number(decoded["sub_type"]),
      expiresAt: expiresAt,
      createdAt: new Date(Number(decoded["created_at"]) * 1000),
    } as SubscriptionRecord;

    return subscriptionRecord;
  }

  static async subscribe(
    { subscriber, smiID, smrID = SUBTOPIA_REGISTRY_APP_ID }: SMISubscribeParams,
    { client, sender, signer }: ChainMethodParams
  ) {
    const smi = new SMI({
      client: client,
      sender: sender ?? subscriber.address,
      signer: signer ?? subscriber.signer,
      appId: smiID,
    });

    const smr = new SMR({
      client: client,
      sender: sender ?? subscriber.address,
      signer: signer ?? subscriber.signer,
      appId: smrID,
    });

    const smiState = await SubtopiaClient.getInfrastructureState(
      client,
      smi.appId,
      false
    );

    const managerAddress = smiState["manager"] as string;

    const managerLocker = await getLocker(
      client,
      managerAddress,
      smr.appAddress
    );

    const feeSp = await getParamsWithFeeCount(client, 3);

    const feeTxn = {
      txn: makePaymentTxnWithSuggestedParamsFromObject({
        from: subscriber.address,
        to: smi.appAddress,
        amount: Number(120_000 + 100_000 + 8000 + 100),
        suggestedParams: feeSp,
      }),
      signer: subscriber.signer,
    };

    const subscribeSp = await getParamsWithFeeCount(client, 0);

    /* eslint-disable prettier/prettier */
    const subscribePayTxn = {
      txn:
        smiState.coinID === 0
          ? makePaymentTxnWithSuggestedParamsFromObject({
              from: subscriber.address,
              to: managerLocker.lsig.address(),
              amount: smiState.price,
              suggestedParams: subscribeSp,
            })
          : makeAssetTransferTxnWithSuggestedParamsFromObject({
              from: subscriber.address,
              to: managerLocker.lsig.address(),
              amount: smiState.price,
              assetIndex: smiState.coinID,
              suggestedParams: subscribeSp,
            }),
      signer: subscriber.signer,
    };

    const result = await smi.subscribe(
      {
        fee_txn: feeTxn,
        subscribe_pay_txn: subscribePayTxn,
        subscriber_account: subscriber.address,
      },
      {
        appAccounts: [subscriber.address],
        boxes: [
          {
            appIndex: smi.appId,
            name: decodeAddress(subscriber.address).publicKey,
          },
        ],
      }
    );

    return new ABIResult<void>(result);
  }

  static async unsubscribe(
    { subscriber, smiID }: SMIUnsubscribeParams,
    { client, sender, signer }: ChainMethodParams
  ) {
    const smi = new SMI({
      client: client,
      sender: sender ?? subscriber.address,
      signer: signer ?? subscriber.signer,
      appId: smiID,
    });

    if (!smi) {
      throw new Error("SMI not initialized");
    }

    const subscriptionRecord =
      await SubtopiaClient.getSubscriptionRecordForAccount(
        client,
        subscriber.address,
        smiID
      );

    const isOptedToPassId = await client
      .accountAssetInformation(subscriber.address, subscriptionRecord.subID)
      .do()
      .then(() => true)
      .catch(() => false);
    const sp = await getParamsWithFeeCount(client, isOptedToPassId ? 3 : 2);

    const result = await smi.unsubscribe(
      { sub_id: BigInt(subscriptionRecord.subID) },
      {
        appAccounts: [subscriber.address],
        boxes: [
          {
            appIndex: smiID,
            name: decodeAddress(subscriber.address).publicKey,
          },
        ],
        suggestedParams: sp,
      }
    );

    return new ABIResult<void>(result);
  }

  static async claimSubscriptionPass(
    { smiID, subID, subscriber }: SMIClaimSubscriptionParams,
    { client, sender, signer }: ChainMethodParams
  ) {
    const smi = new SMI({
      client: client,
      sender: sender ?? subscriber.address,
      signer: signer ?? subscriber.signer,
      appId: smiID,
    });

    if (!smi) {
      throw new Error("SMI not initialized");
    }
    const isOptedToPassId = await client
      .accountAssetInformation(subscriber.address, subID)
      .do()
      .then(() => true)
      .catch(() => false);

    if (!isOptedToPassId) {
      await optInAsset(client, subscriber.address, subscriber.signer, subID);
    }

    const sp = await getParamsWithFeeCount(client, 3);

    const result = await smi.claim_subscription(
      {
        subscription_id: BigInt(subID),
      },
      { suggestedParams: sp, appForeignAssets: [subID] }
    );

    return new ABIResult<void>(result);
  }

  static async claimRevenue(
    {
      smrID = SUBTOPIA_REGISTRY_APP_ID,
      user,
      coinID = 0,
    }: SMIClaimRevenueParams,
    { client, sender, signer }: ChainMethodParams
  ) {
    const smr = new SMR({
      client: client,
      sender: sender ?? user.address,
      signer: signer ?? user.signer,
      appId: smrID,
    });

    if (!smr) {
      throw new Error("SMI not initialized");
    }

    const locker = await getLocker(client, user.address, smr.appAddress);

    const atc = new AtomicTransactionComposer();

    const sp = await getParamsWithFeeCount(client, 2);

    atc.addTransaction({
      txn: makePaymentTxnWithSuggestedParamsFromObject({
        from: user.address,
        suggestedParams: sp,
        to: locker.lsig.address(),
        amount: 0,
      }),
      signer: user.signer,
    });

    const app_sp = await getParamsWithFeeCount(client, 0);
    const lockerInfo = await client
      .accountInformation(locker.lsig.address())
      .do();

    let withdrawalAmount =
      lockerInfo["amount"] - lockerInfo["min-balance"] - 1000;
    withdrawalAmount = withdrawalAmount < 0 ? 0 : withdrawalAmount;

    if (coinID > 0) {
      const isOptedToCoinID = await client
        .accountAssetInformation(user.address, coinID)
        .do()
        .then(() => true)
        .catch(() => false);
      if (!isOptedToCoinID) {
        await optInAsset(client, user.address, user.signer, coinID);
      }

      withdrawalAmount =
        lockerInfo["assets"].find(
          (asset: { [x: string]: number }) => asset["asset-id"] === coinID
        )?.amount ?? 0;

      atc.addTransaction({
        txn: makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: locker.lsig.address(),
          suggestedParams: app_sp,
          to: user.address,
          amount: withdrawalAmount,
          assetIndex: coinID,
        }),
        signer: locker.signer,
      });
    } else {
      atc.addTransaction({
        txn: makePaymentTxnWithSuggestedParamsFromObject({
          from: locker.lsig.address(),
          suggestedParams: app_sp,
          to: user.address,
          amount: withdrawalAmount,
        }),
        signer: locker.signer,
      });
    }

    const response = await atc.execute(client, 4);

    return response.txIDs;
  }

  static async transferSubscriptionPass(
    { newOwnerAddress, oldOwner, subID, smiID }: SMITransferSubscriptionParams,
    { client, sender, signer }: ChainMethodParams
  ) {
    const smi = new SMI({
      client: client,
      sender: sender ?? oldOwner.address,
      signer: signer ?? oldOwner.signer,
      appId: smiID,
    });

    if (!smi) {
      throw new Error("SMI not initialized");
    }

    const result = await smi.transfer_subscription(
      {
        new_address: newOwnerAddress,
        subscription_id: BigInt(subID),
      },
      {
        appAccounts: [newOwnerAddress],
        appForeignAssets: [subID],
        boxes: [
          {
            appIndex: smi.appId,
            name: decodeAddress(oldOwner.address).publicKey,
          },

          {
            appIndex: smi.appId,
            name: decodeAddress(newOwnerAddress).publicKey,
          },
        ],
      }
    );

    return new ABIResult<void>(result);
  }

  static async markForDeletion(
    { smiID, user, smrID = SUBTOPIA_REGISTRY_APP_ID }: SMIMarkForDeletionParams,
    { client, sender, signer }: ChainMethodParams
  ) {
    const smi = new SMI({
      client: client,
      sender: sender ?? user.address,
      signer: signer ?? user.signer,
      appId: smiID,
    });

    const smr = new SMR({
      client: client,
      sender: sender ?? user.address,
      signer: signer ?? user.signer,
      appId: smrID,
    });

    if (!smi) {
      throw new Error("SMI not initialized");
    }

    const smiState = await SubtopiaClient.getInfrastructureState(
      client,
      smi.appId,
      false
    );

    const sp = await getParamsWithFeeCount(client, 3);
    const userLocker = await getLocker(client, user.address, smr.appAddress);

    const result = await smi.mark_for_deletion(
      {
        locker_fund_txn: {
          txn: makePaymentTxnWithSuggestedParamsFromObject({
            from: user.address,
            to: userLocker.lsig.address(),
            amount: (
              await getParamsWithFeeCount(client, 3 * smiState.activeSubs)
            ).fee,
            suggestedParams: await getParamsWithFeeCount(client, 2),
          }),
          signer: user.signer,
        },
      },
      {
        suggestedParams: sp,
      }
    );

    return new ABIResult<void>(result);
  }

  static async deleteSubscription(
    {
      smiID,
      user,
      smrID = SUBTOPIA_REGISTRY_APP_ID,
    }: SMIDeleteSubscriptionParams,
    { client, sender, signer }: ChainMethodParams
  ) {
    const smi = new SMI({
      client: client,
      sender: sender ?? user.address,
      signer: signer ?? user.signer,
      appId: smiID,
    });

    const smr = new SMR({
      client: client,
      sender: sender ?? user.address,
      signer: signer ?? user.signer,
      appId: smrID,
    });

    if (!smi) {
      throw new Error("SMI not initialized");
    }

    const smiState = await SubtopiaClient.getInfrastructureState(
      client,
      smi.appId,
      false
    );

    // True if the subscription is marked for deletion, value 1
    if (!smiState.lifecycle) {
      await SubtopiaClient.markForDeletion(
        {
          smiID: smiID,
          smrID: smrID,
          user: user,
        },
        {
          client: client,
        }
      );
    }

    const maxTxnsPerGroup = 16;
    const userLocker = await getLocker(client, user.address, smr.appAddress);
    const subscribersFromBoxes: string[] = (
      await client.getApplicationBoxes(smiID).do()
    )["boxes"].map((item) => {
      return encodeAddress(item.name);
    });

    for (let i = 0; i < subscribersFromBoxes.length; i += maxTxnsPerGroup) {
      const subscribesSubsetFromBoxes = subscribersFromBoxes.slice(
        i,
        i + maxTxnsPerGroup
      );
      const atc = new AtomicTransactionComposer();

      const methodCalls = subscribesSubsetFromBoxes.map(
        async (subscriber: string, j: number) => {
          const subscriberBox =
            await SubtopiaClient.getSubscriptionRecordForAccount(
              client,
              subscriber,
              smiID
            );
          atc.addMethodCall({
            sender: userLocker.authAddress,
            signer: userLocker.signer,
            appID: smiID,
            method: algosdk.getMethodByName(smi.methods, "delete_subscription"),
            methodArgs: [subscriber, subscriberBox.subID],
            appForeignAssets: [subscriberBox.subID],
            appAccounts: [subscriber],
            boxes: [
              {
                appIndex: smi.appId,
                name: decodeAddress(subscriber).publicKey,
              },
            ],
            suggestedParams:
              j === 0
                ? await getParamsWithFeeCount(
                    client,
                    3 * subscribesSubsetFromBoxes.length
                  )
                : await getParamsWithFeeCount(client, 0),
          });
        }
      );
      console.log(
        "Method calls",
        methodCalls.length,
        subscribesSubsetFromBoxes
      );
      await Promise.all(methodCalls);

      await atc.execute(client, DEFAULT_AWAIT_ROUNDS);
    }

    if (userLocker.authAddress !== smr.appAddress) {
      const response = await rekeyLocker({
        client: client,
        locker: userLocker.lsig,
        creatorAddress: user.address,
        creatorSigner: user.signer,
        registryAddress: smr.appAddress,
        registrySigner: smr.signer,
        rekeyToAddress: smr.appAddress,
      });
      console.log("Rekeyed locker", response);
    }

    const response = await smr.delete_smi(
      {
        smi_id: BigInt(smiID),
      },
      {
        appForeignApps: [smiID],
        appAccounts: [userLocker.lsig.address()],
        suggestedParams: await getParamsWithFeeCount(client, 4),
      }
    );

    return response;
  }
}
