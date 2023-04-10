// =============================================================================
// Subtopia JS SDK
// Copyright (C) 2023 Altynbek Orumbayev
// =============================================================================

import {
  decodeAddress,
  makePaymentTxnWithSuggestedParamsFromObject,
} from "algosdk";
import { ABIResult } from "beaker-ts";
import {
  getLocker,
  getParamsWithFeeCount,
  normalizePrice,
  rekeyLocker,
} from "./common/utils";
import { PendingTransfer, SMR } from "./contracts/smr_client";
import { getAssetByID } from "./common/utils";
import { PriceNormalizationType, SubscriptionType } from "./common/enums";
import {
  PendingTransferRecord,
  SMRAddInfrastructureParams,
  SMRClaimInfrastructureParams,
  SMRGetRegistryParams,
  SMRTransferInfrastructureParams,
} from "./common/interfaces";
import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";
import {
  SUBTOPIA_CONTRACTS_VERSION,
  SUBTOPIA_REGISTRY_APP_ID,
} from "./common/constants";
import { SubtopiaClient } from "./client";

export class SubtopiaAdminClient {
  static async getRegistryAddress({
    client,
    user,
    smrID = SUBTOPIA_REGISTRY_APP_ID,
  }: SMRGetRegistryParams): Promise<string> {
    const smr = new SMR({
      client,
      sender: user.address,
      signer: user.signer,
      appId: smrID,
    });

    return smr.appAddress;
  }

  static async getPendingTransferRecordForAccount(
    client: AlgodClient,
    subscriberAddress: string,
    smrID = SUBTOPIA_REGISTRY_APP_ID
  ): Promise<PendingTransferRecord | undefined> {
    try {
      const boxName = decodeAddress(subscriberAddress).publicKey;

      const response = await client
        .getApplicationBoxByName(smrID, boxName)
        .do();
      const decoded = PendingTransfer.decodeBytes(response.value);

      const pendingTransferRecord = {
        locker: String(decoded["locker"]),
        smiID: Number(decoded["smi_id"]),
      } as PendingTransferRecord;

      return pendingTransferRecord;
    } catch (e) {
      return undefined;
    }
  }

  static async addInfrastructure({
    creator,
    client,
    smrID = SUBTOPIA_REGISTRY_APP_ID,
    version = SUBTOPIA_CONTRACTS_VERSION,
    name,
    price,
    subType = SubscriptionType.UNLIMITED,
    maxSubs = 0,
    coinID = 0,
  }: SMRAddInfrastructureParams): Promise<ABIResult<void>> {
    const smr = new SMR({
      client,
      sender: creator.address,
      signer: creator.signer,
      appId: smrID,
    });
    const locker = await getLocker(client, creator.address, smr.appAddress);

    if (locker.authAddress !== smr.appAddress) {
      const response = await rekeyLocker({
        client: client,
        locker: locker.lsig,
        creatorAddress: creator.address,
        creatorSigner: creator.signer,
        registryAddress: smr.appAddress,
        registrySigner: smr.signer,
        rekeyToAddress: smr.appAddress,
      });

      console.log("Rekeyed locker", response);
    }

    const suggestedParams = await getParamsWithFeeCount(client, 2);

    const feeTxn = makePaymentTxnWithSuggestedParamsFromObject({
      from: creator.address,
      to: smr.appAddress,
      amount: Number(880_000 + (coinID === 0 ? 0 : 2_000)),
      suggestedParams,
    });

    const asset = await getAssetByID(client, coinID);

    const result = await smr.add(
      {
        fee_txn: feeTxn,
        name: name,
        price: BigInt(
          normalizePrice(price, asset.decimals, PriceNormalizationType.RAW)
        ),
        sub_type: BigInt(subType),
        max_subs: BigInt(maxSubs),
        coin_id: BigInt(coinID),
        version: version,
        manager: creator.address,
        locker: locker.lsig.address(),
      },
      {
        appAccounts: [locker.lsig.address()],
        appForeignAssets: coinID > 0 ? [coinID] : [],
      }
    );

    const abiResult = new ABIResult<void>(result);

    return abiResult;
  }

  static async transferInfrastructure({
    creator,
    newCreatorAddress,
    smrID = SUBTOPIA_REGISTRY_APP_ID,
    smiID,
    client,
  }: SMRTransferInfrastructureParams): Promise<ABIResult<void>> {
    const smr = new SMR({
      client,
      sender: creator.address,
      signer: creator.signer,
      appId: smrID,
    });
    const locker = await getLocker(client, creator.address, smr.appAddress);

    const pendingTransfers =
      await SubtopiaAdminClient.getPendingTransferRecordForAccount(
        client,
        newCreatorAddress,
        smrID
      );

    if (pendingTransfers) {
      throw new Error(
        "New owner have a pending transfer. He must complete it before accepting new transfers."
      );
    }

    if (locker.authAddress !== smr.appAddress) {
      const response = await rekeyLocker({
        client: client,
        locker: locker.lsig,
        creatorAddress: creator.address,
        creatorSigner: creator.signer,
        registryAddress: smr.appAddress,
        registrySigner: smr.signer,
        rekeyToAddress: smr.appAddress,
      });
      console.log("Rekeyed locker", response);
    }

    const suggestedParams = await getParamsWithFeeCount(client, 2);

    const newManagerLocker = await getLocker(
      client,
      newCreatorAddress,
      smr.appAddress
    );

    const feeTxn = makePaymentTxnWithSuggestedParamsFromObject({
      from: creator.address,
      to: smr.appAddress,
      amount: Number(510_000),
      suggestedParams,
    });
    const result = await smr.transfer_smi(
      {
        transfer_fee_txn: feeTxn,
        new_owner: newCreatorAddress,
        smi_id: BigInt(smiID),
        old_locker: locker.lsig.address(),
        new_locker: newManagerLocker.lsig.address(),
      },
      {
        appAccounts: [locker.lsig.address(), newManagerLocker.lsig.address()],
        appForeignApps: [smiID],
        boxes: [
          {
            appIndex: smr.appId,
            name: decodeAddress(newCreatorAddress).publicKey,
          },
        ],
      }
    );

    const abiResult = new ABIResult<void>(result);

    return abiResult;
  }

  static async claimInfrastructure({
    creator,
    smrID = SUBTOPIA_REGISTRY_APP_ID,
    smiID,
    client,
  }: SMRClaimInfrastructureParams): Promise<ABIResult<void>> {
    const smr = new SMR({
      client,
      sender: creator.address,
      signer: creator.signer,
      appId: smrID,
    });
    const locker = await getLocker(client, creator.address, smr.appAddress);

    if (locker.authAddress !== smr.appAddress) {
      const response = await rekeyLocker({
        client: client,
        locker: locker.lsig,
        creatorAddress: creator.address,
        creatorSigner: creator.signer,
        registryAddress: smr.appAddress,
        registrySigner: smr.signer,
        rekeyToAddress: smr.appAddress,
      });
      console.log("Rekeyed locker", response);
    }

    const smiState = await SubtopiaClient.getInfrastructureState(client, smiID);
    const foreignAssetRef =
      smiState.coinID > 0 ? { appForeignAssets: [smiState.coinID] } : {};

    const result = await smr.claim_smi(
      {
        new_owner: creator.address,
        smi: BigInt(smiID),
        coin_id: BigInt(smiState.coinID),
      },
      {
        appAccounts: [locker.lsig.address()],
        appForeignApps: [smiID],
        suggestedParams: await getParamsWithFeeCount(
          client,
          smiState.coinID > 0 ? 3 : 2
        ),
        boxes: [
          {
            appIndex: smr.appId,
            name: decodeAddress(creator.address).publicKey,
          },
        ],
        ...foreignAssetRef,
      }
    );

    const abiResult = new ABIResult<void>(result);

    return abiResult;
  }
}
