import {
  ABIType,
  ABIValue,
  ABIMethod,
  AtomicTransactionComposer,
  TransactionWithSigner,
  getMethodByName,
  Transaction,
  TransactionSigner,
  makePaymentTxnWithSuggestedParamsFromObject,
} from "algosdk";
import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";
import {
  decodeNamedTuple,
  Schema,
  AVMType,
  ApplicationClient,
  ABIResult,
  TransactionOverrides,
  State,
  StateValue,
} from "beaker-ts";
import { encodeAddress } from "algosdk";

function strOrHex(v: Buffer): string {
  try {
    const response = v.toString(`utf-8`);
    try {
      if (response && v.toString(`hex`).length === 64) {
        const addressString = encodeAddress(new Uint8Array(v));
        return addressString;
      }
    } catch (e) {
      return response;
    }
    return response;
  } catch (e) {
    return v.toString(`hex`);
  }
}

function decodeState(state: StateValue[], raw?: boolean): State {
  const obj = {} as State;

  // Start with empty set
  for (const stateVal of state) {
    const keyBuff = Buffer.from(stateVal.key, `base64`);
    const key = raw ? keyBuff.toString(`hex`) : strOrHex(keyBuff);
    const value = stateVal.value;

    // In both global-state and state deltas, 1 is bytes and 2 is int
    const dataTypeFlag = value.action ? value.action : value.type;
    switch (dataTypeFlag) {
      case 1:
        // eslint-disable-next-line no-case-declarations
        const valBuff = Buffer.from(value.bytes, `base64`);
        obj[key] = raw ? new Uint8Array(valBuff) : strOrHex(valBuff);
        break;
      case 2:
        obj[key] = value.uint;
        break;
      default: // ??
    }
  }

  return obj;
}

export default async function loadApplicationState(
  client: AlgodClient,
  appId: number,
  raw?: boolean
): Promise<State> {
  const appInfo = await client.getApplicationByID(appId).do();

  if (!(`params` in appInfo) || !(`global-state` in appInfo[`params`]))
    throw new Error(`No global state found`);

  const decoded = decodeState(appInfo[`params`][`global-state`], raw);

  return decoded;
}

export class SubtopiaSubscription {
  sub_type = "";
  sub_asa_id = BigInt(0);
  created_at_timestamp = BigInt(0);
  updated_at_timestamp = BigInt(0);
  static codec: ABIType = ABIType.from("(string,uint64,uint64,uint64)");
  static fields: string[] = [
    "sub_type",
    "sub_asa_id",
    "created_at_timestamp",
    "updated_at_timestamp",
  ];
  static decodeResult(val: ABIValue | undefined): SubtopiaSubscription {
    return decodeNamedTuple(
      val,
      SubtopiaSubscription.fields
    ) as SubtopiaSubscription;
  }
  static decodeBytes(val: Uint8Array): SubtopiaSubscription {
    return decodeNamedTuple(
      SubtopiaSubscription.codec.decode(val),
      SubtopiaSubscription.fields
    ) as SubtopiaSubscription;
  }
}

export class Subtopia extends ApplicationClient {
  desc = "";

  override appSchema: Schema = {
    declared: {
      sub_name: {
        type: AVMType.bytes,
        key: "sub_name",
        desc: "",
        static: false,
      },
      sub_manager: {
        type: AVMType.bytes,
        key: "sub_manager",
        desc: "",
        static: false,
      },
      sub_price: {
        type: AVMType.uint64,
        key: "sub_price",
        desc: "",
        static: false,
      },
      sub_total_items: {
        type: AVMType.uint64,
        key: "sub_total_items",
        desc: "",
        static: false,
      },
      sub_max_items: {
        type: AVMType.uint64,
        key: "sub_max_items",
        desc: "",
        static: false,
      },
      sub_asa_id: {
        type: AVMType.uint64,
        key: "sub_asa_id",
        desc: "",
        static: false,
      },
      sub_type: {
        type: AVMType.bytes,
        key: "sub_type",
        desc: "",
        static: false,
      },
      sub_expiration_timestamp: {
        type: AVMType.uint64,
        key: "sub_expiration_timestamp",
        desc: "",
        static: false,
      },
    },
    reserved: {},
  };
  override acctSchema: Schema = { declared: {}, reserved: {} };
  override approvalProgram = "";
  override clearProgram = "";
  override methods: ABIMethod[] = [
    new ABIMethod({
      name: "subscribe",
      desc: "",
      args: [
        { type: "pay", name: "box_fee_txn", desc: "" },
        { type: "txn", name: "subscribe_pay_txn", desc: "" },
        { type: "account", name: "subscriber_account", desc: "" },
      ],
      returns: { type: "void", desc: "" },
    }),
    new ABIMethod({
      name: "get_subscription",
      desc: "",
      args: [{ type: "address", name: "subscriber_address", desc: "" }],
      returns: { type: "void", desc: "" },
    }),
    new ABIMethod({
      name: "claim_subscription",
      desc: "",
      args: [],
      returns: { type: "void", desc: "" },
    }),
    new ABIMethod({
      name: "transfer_subscription",
      desc: "",
      args: [{ type: "address", name: "new_address", desc: "" }],
      returns: { type: "void", desc: "" },
    }),
    new ABIMethod({
      name: "delete_subscription",
      desc: "",
      args: [],
      returns: { type: "void", desc: "" },
    }),
  ];

  constructor(
    client: AlgodClient,
    sender: string,
    signer: TransactionSigner,
    appId: number
  ) {
    super({ client, sender, signer, appId });
  }

  static async init(
    client: AlgodClient,
    sender: string,
    signer: TransactionSigner,
    appId: number
  ) {
    const instance = new Subtopia(client, sender, signer, appId);
    const stateResponse = await instance.client.getApplicationByID(appId).do();
    instance.approvalProgram = stateResponse.params["approval-program"];
    instance.clearProgram = stateResponse.params["clear-state-program"];

    return instance;
  }

  override getApplicationState(raw?: boolean | undefined): Promise<State> {
    return loadApplicationState(this.client, this.appId, raw);
  }

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
  async get_subscription(
    args: {
      subscriber_address: string;
    },
    txnParams?: TransactionOverrides
  ): Promise<ABIResult<void>> {
    const result = await this.execute(
      await this.compose.get_subscription(
        { subscriber_address: args.subscriber_address },
        txnParams
      )
    );
    return new ABIResult<void>(result);
  }
  async claim_subscription(
    txnParams?: TransactionOverrides
  ): Promise<ABIResult<void>> {
    const result = await this.execute(
      await this.compose.claim_subscription(txnParams)
    );
    return new ABIResult<void>(result);
  }
  async transfer_subscription(
    args: {
      new_address: string;
    },
    txnParams?: TransactionOverrides
  ): Promise<ABIResult<void>> {
    const result = await this.execute(
      await this.compose.transfer_subscription(
        { new_address: args.new_address },
        txnParams
      )
    );
    return new ABIResult<void>(result);
  }
  async delete_subscription(
    txnParams?: TransactionOverrides
  ): Promise<ABIResult<void>> {
    const result = await this.execute(
      await this.compose.delete_subscription(txnParams)
    );
    return new ABIResult<void>(result);
  }
  compose = {
    subscribe: async (
      args: {
        box_fee_txn: TransactionWithSigner | Transaction;
        subscribe_pay_txn: TransactionWithSigner | Transaction;
        subscriber_account: string;
      },
      txnParams?: TransactionOverrides,
      atc?: AtomicTransactionComposer
    ): Promise<AtomicTransactionComposer> => {
      return this.addMethodCall(
        getMethodByName(this.methods, "subscribe"),
        {
          box_fee_txn: args.box_fee_txn,
          subscribe_pay_txn: args.subscribe_pay_txn,
          subscriber_account: args.subscriber_account,
        },
        txnParams,
        atc
      );
    },
    get_subscription: async (
      args: {
        subscriber_address: string;
      },
      txnParams?: TransactionOverrides,
      atc?: AtomicTransactionComposer
    ): Promise<AtomicTransactionComposer> => {
      return this.addMethodCall(
        getMethodByName(this.methods, "get_subscription"),
        { subscriber_address: args.subscriber_address },
        txnParams,
        atc
      );
    },
    claim_subscription: async (
      txnParams?: TransactionOverrides,
      atc?: AtomicTransactionComposer
    ): Promise<AtomicTransactionComposer> => {
      return this.addMethodCall(
        getMethodByName(this.methods, "claim_subscription"),
        {},
        txnParams,
        atc
      );
    },
    transfer_subscription: async (
      args: {
        new_address: string;
      },
      txnParams?: TransactionOverrides,
      atc?: AtomicTransactionComposer
    ): Promise<AtomicTransactionComposer> => {
      return this.addMethodCall(
        getMethodByName(this.methods, "transfer_subscription"),
        { new_address: args.new_address },
        txnParams,
        atc
      );
    },
    delete_subscription: async (
      txnParams?: TransactionOverrides,
      atc?: AtomicTransactionComposer
    ): Promise<AtomicTransactionComposer> => {
      return this.addMethodCall(
        getMethodByName(this.methods, "delete_subscription"),
        {},
        txnParams,
        atc
      );
    },
  };
}
