import {
  Algodv2,
  makePaymentTxnWithSuggestedParamsFromObject,
  TransactionSigner,
  AtomicTransactionComposer,
  makeAssetCreateTxnWithSuggestedParamsFromObject,
  makeAssetTransferTxnWithSuggestedParamsFromObject,
  Account,
  Address,
} from "algosdk";
import { DEFAULT_AWAIT_ROUNDS } from "../src/constants";
import { PriceNormalizationType } from "../src/types/enums";
import { normalizePrice, optInAsset } from "../src/utils";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";

export interface AssetMetadata {
  index: number;
  name: string;
  total: number;
  decimals: number;
}

export async function getRandomAccount(
  algorandClient: AlgorandClient,
  funderAddress: Address,
  funderSigner: TransactionSigner,
  asset?: AssetMetadata,
) {
  const randomAccount = algorandClient.account.random();
  const client = algorandClient.client.algod;

  let atc = new AtomicTransactionComposer();
  atc.addTransaction({
    txn: makePaymentTxnWithSuggestedParamsFromObject({
      sender: funderAddress,
      receiver: randomAccount.addr,
      amount: Number(50e6),
      suggestedParams: await client.getTransactionParams().do(),
    }),
    signer: funderSigner,
  });

  await atc.execute(client, DEFAULT_AWAIT_ROUNDS);

  if (asset) {
    await optInAsset({
      client: client,
      account: { signer: funderSigner, addr: randomAccount.addr },
      assetID: asset.index,
    });

    atc = new AtomicTransactionComposer();
    atc.addTransaction({
      txn: makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: funderAddress,
        receiver: randomAccount.addr,
        amount: normalizePrice(
          asset.total,
          asset.decimals,
          PriceNormalizationType.RAW,
        ),
        suggestedParams: await client.getTransactionParams().do(),
        assetIndex: asset.index,
      }),
      signer: funderSigner,
    });

    await atc.execute(client, DEFAULT_AWAIT_ROUNDS);
  }

  return randomAccount;
}

export async function generateRandomAsset(
  client: Algodv2,
  sender: Account,
  assetName?: string,
  total?: number,
  decimals?: number,
) {
  total = !total ? Math.floor(Math.random() * 100) + 20 : total;
  decimals = !decimals ? Math.floor(Math.random() * 10) + 2 : decimals;
  assetName = !assetName
    ? `ASA ${Math.floor(Math.random() * 100) + 1}_${
        Math.floor(Math.random() * 100) + 1
      }_${total}`
    : assetName;

  const params = await client.getTransactionParams().do();

  const txn = makeAssetCreateTxnWithSuggestedParamsFromObject({
    sender: sender.addr,
    suggestedParams: params,
    total: normalizePrice(total, decimals, PriceNormalizationType.RAW),
    decimals: decimals,
    defaultFrozen: false,
    unitName: "",
    assetName: assetName,
    manager: sender.addr,
    reserve: sender.addr,
    freeze: sender.addr,
    clawback: sender.addr,
    assetURL: "https://path/to/my/asset/details",
  });

  const stxn = txn.signTxn(sender.sk);

  const txidResponse = await client.sendRawTransaction(stxn).do();
  const txid = txidResponse.txid;

  const ptx = await client.pendingTransactionInformation(txid).do();

  const assetId = Number(ptx.assetIndex!);

  return {
    index: assetId,
    total: total,
    decimals: decimals,
    name: assetName,
  } as AssetMetadata;
}

export function getRandomElement<T>(array: T[]): T {
  const length: number = array.length;
  const randomIndex: number = Math.floor(Math.random() * length);
  return array[randomIndex];
}
