import {
  TransactionSigner,
  makePaymentTxnWithSuggestedParamsFromObject,
} from "algosdk";
import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";
import { ABIResult, TransactionOverrides } from "beaker-ts";
import { Manager } from "manager_client";
import { Registry } from "registry_client";

export class Subtopia {
  client: AlgodClient;
  sender: string;
  signer: TransactionSigner;
  registryId: number;
  manager?: Manager;
  registry?: Registry;

  constructor(
    client: AlgodClient,
    sender: string,
    signer: TransactionSigner,
    registryId: number
  ) {
    this.client = client;
    this.sender = sender;
    this.signer = signer;
    this.registryId = registryId;

    this.manager = new Manager({ client, sender, signer });
    this.registry = new Registry({ client, sender, signer, appId: registryId });
  }

  // static async init(
  //   client: AlgodClient,
  //   sender: string,
  //   signer: TransactionSigner,
  //   appId: number
  // ) {
  //   const instance = new Subtopia(client, sender, signer, appId);
  //   const stateResponse = await instance.client.getApplicationByID(appId).do();
  //   instance.approvalProgram = stateResponse.params["approval-program"];
  //   instance.clearProgram = stateResponse.params["clear-state-program"];

  //   return instance;
  // }

  async subscribe(
    subscriberAddress: string,
    managerAddress: string,
    subscriptionPrice: number,
    txnParams?: TransactionOverrides
  ): Promise<ABIResult<void>> {
    const suggestedParams = await this.getSuggestedParams();
    suggestedParams.fee = 2000;

    const boxFeeTxn = makePaymentTxnWithSuggestedParamsFromObject({
      from: subscriberAddress,
      to: this.appAddress,
      amount: Number(120100 + 100000),
      suggestedParams,
    });

    const subscriberPayTxn = makePaymentTxnWithSuggestedParamsFromObject({
      from: subscriberAddress,
      to: managerAddress,
      amount: Number(subscriptionPrice),
      suggestedParams,
    });

    const result = await this.execute(
      await this.compose.subscribe(
        {
          box_fee_txn: boxFeeTxn,
          subscribe_pay_txn: subscriberPayTxn,
          subscriber_account: subscriberAddress,
        },
        txnParams
      )
    );
    return new ABIResult<void>(result);
  }
}
