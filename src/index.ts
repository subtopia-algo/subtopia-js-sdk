import {
  ABIType,
  ABIValue,
  ABIMethod,
  AtomicTransactionComposer,
  TransactionWithSigner,
  getMethodByName,
  Transaction,
} from "algosdk";
import {
  decodeNamedTuple,
  Schema,
  AVMType,
  ApplicationClient,
  ABIResult,
  TransactionOverrides,
} from "beaker-ts";

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
  override approvalProgram =
    "I3ByYWdtYSB2ZXJzaW9uIDgKaW50Y2Jsb2NrIDAgMSAxMCAyCmJ5dGVjYmxvY2sgMHg3Mzc1NjI1Zjc0NmY3NDYxNmM1ZjY5NzQ2NTZkNzMgMHg3Mzc1NjI1ZjZkNjE2ZTYxNjc2NTcyIDB4IDB4NzM3NTYyNWY3MDcyNjk2MzY1IDB4NzM3NTYyNWY2ZDYxNzg1ZjY5NzQ2NTZkNzMgMHg3Mzc1NjI1ZjZlNjE2ZDY1IDB4NzM3NTYyNWY3NDc5NzA2NSAweDczNzU2MjVmNjE3MzYxNWY2OTY0IDB4NzM3NTYyNWY2NTc4NzA2OTcyNjE3NDY5NmY2ZTVmNzQ2OTZkNjU3Mzc0NjE2ZDcwCnR4biBOdW1BcHBBcmdzCmludGNfMCAvLyAwCj09CmJueiBtYWluX2wxNgp0eG5hIEFwcGxpY2F0aW9uQXJncyAwCnB1c2hieXRlcyAweDNkZmNlNmJlIC8vICJ1cGRhdGVfY29uZmlnKHBheSxzdHJpbmcsc3RyaW5nLHVpbnQ2NCx1aW50NjQsdWludDY0LHVpbnQ2NCl2b2lkIgo9PQpibnogbWFpbl9sMTUKdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMApwdXNoYnl0ZXMgMHhjODZmZGIwMSAvLyAidXBkYXRlX21hbmFnZXIoYWRkcmVzcyl2b2lkIgo9PQpibnogbWFpbl9sMTQKdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMApwdXNoYnl0ZXMgMHgxODJlMzY3OSAvLyAic3Vic2NyaWJlKHBheSx0eG4sYWNjb3VudCl2b2lkIgo9PQpibnogbWFpbl9sMTMKdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMApwdXNoYnl0ZXMgMHg4NzZmZDg1MSAvLyAiZ2V0X3N1YnNjcmlwdGlvbihhZGRyZXNzLChzdHJpbmcsdWludDY0LHVpbnQ2NCx1aW50NjQpKXZvaWQiCj09CmJueiBtYWluX2wxMgp0eG5hIEFwcGxpY2F0aW9uQXJncyAwCnB1c2hieXRlcyAweDI2OTYzODk2IC8vICJjbGFpbV9zdWJzY3JpcHRpb24oKXZvaWQiCj09CmJueiBtYWluX2wxMQp0eG5hIEFwcGxpY2F0aW9uQXJncyAwCnB1c2hieXRlcyAweGMwN2Y3NmZiIC8vICJ0cmFuc2Zlcl9zdWJzY3JpcHRpb24oYWRkcmVzcyl2b2lkIgo9PQpibnogbWFpbl9sMTAKdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMApwdXNoYnl0ZXMgMHg3ZDA5ZDY0YiAvLyAiZGVsZXRlX3N1YnNjcmlwdGlvbigpdm9pZCIKPT0KYm56IG1haW5fbDkKZXJyCm1haW5fbDk6CnR4biBPbkNvbXBsZXRpb24KaW50Y18wIC8vIE5vT3AKPT0KdHhuIEFwcGxpY2F0aW9uSUQKaW50Y18wIC8vIDAKIT0KJiYKYXNzZXJ0CmNhbGxzdWIgZGVsZXRlc3Vic2NyaXB0aW9uXzE2CmludGNfMSAvLyAxCnJldHVybgptYWluX2wxMDoKdHhuIE9uQ29tcGxldGlvbgppbnRjXzAgLy8gTm9PcAo9PQp0eG4gQXBwbGljYXRpb25JRAppbnRjXzAgLy8gMAohPQomJgphc3NlcnQKdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMQpjYWxsc3ViIHRyYW5zZmVyc3Vic2NyaXB0aW9uXzE1CmludGNfMSAvLyAxCnJldHVybgptYWluX2wxMToKdHhuIE9uQ29tcGxldGlvbgppbnRjXzAgLy8gTm9PcAo9PQp0eG4gQXBwbGljYXRpb25JRAppbnRjXzAgLy8gMAohPQomJgphc3NlcnQKY2FsbHN1YiBjbGFpbXN1YnNjcmlwdGlvbl8xNAppbnRjXzEgLy8gMQpyZXR1cm4KbWFpbl9sMTI6CnR4biBPbkNvbXBsZXRpb24KaW50Y18wIC8vIE5vT3AKPT0KdHhuIEFwcGxpY2F0aW9uSUQKaW50Y18wIC8vIDAKIT0KJiYKYXNzZXJ0CnR4bmEgQXBwbGljYXRpb25BcmdzIDEKc3RvcmUgMTAKdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMgpzdG9yZSAxMQpsb2FkIDEwCmxvYWQgMTEKY2FsbHN1YiBnZXRzdWJzY3JpcHRpb25fMTMKaW50Y18xIC8vIDEKcmV0dXJuCm1haW5fbDEzOgp0eG4gT25Db21wbGV0aW9uCmludGNfMCAvLyBOb09wCj09CnR4biBBcHBsaWNhdGlvbklECmludGNfMCAvLyAwCiE9CiYmCmFzc2VydAp0eG5hIEFwcGxpY2F0aW9uQXJncyAxCmludGNfMCAvLyAwCmdldGJ5dGUKc3RvcmUgOQp0eG4gR3JvdXBJbmRleAppbnRjXzMgLy8gMgotCnN0b3JlIDcKbG9hZCA3Cmd0eG5zIFR5cGVFbnVtCmludGNfMSAvLyBwYXkKPT0KYXNzZXJ0CnR4biBHcm91cEluZGV4CmludGNfMSAvLyAxCi0Kc3RvcmUgOApsb2FkIDcKbG9hZCA4CmxvYWQgOQpjYWxsc3ViIHN1YnNjcmliZV8xMgppbnRjXzEgLy8gMQpyZXR1cm4KbWFpbl9sMTQ6CnR4biBPbkNvbXBsZXRpb24KaW50Y18wIC8vIE5vT3AKPT0KdHhuIEFwcGxpY2F0aW9uSUQKaW50Y18wIC8vIDAKIT0KJiYKYXNzZXJ0CnR4bmEgQXBwbGljYXRpb25BcmdzIDEKY2FsbHN1YiB1cGRhdGVtYW5hZ2VyXzExCmludGNfMSAvLyAxCnJldHVybgptYWluX2wxNToKdHhuIE9uQ29tcGxldGlvbgppbnRjXzAgLy8gTm9PcAo9PQp0eG4gQXBwbGljYXRpb25JRAppbnRjXzAgLy8gMAohPQomJgphc3NlcnQKdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMQpzdG9yZSAxCnR4bmEgQXBwbGljYXRpb25BcmdzIDIKc3RvcmUgMgp0eG5hIEFwcGxpY2F0aW9uQXJncyAzCmJ0b2kKc3RvcmUgMwp0eG5hIEFwcGxpY2F0aW9uQXJncyA0CmJ0b2kKc3RvcmUgNAp0eG5hIEFwcGxpY2F0aW9uQXJncyA1CmJ0b2kKc3RvcmUgNQp0eG5hIEFwcGxpY2F0aW9uQXJncyA2CmJ0b2kKc3RvcmUgNgp0eG4gR3JvdXBJbmRleAppbnRjXzEgLy8gMQotCnN0b3JlIDAKbG9hZCAwCmd0eG5zIFR5cGVFbnVtCmludGNfMSAvLyBwYXkKPT0KYXNzZXJ0CmxvYWQgMApsb2FkIDEKbG9hZCAyCmxvYWQgMwpsb2FkIDQKbG9hZCA1CmxvYWQgNgpjYWxsc3ViIHVwZGF0ZWNvbmZpZ18xMAppbnRjXzEgLy8gMQpyZXR1cm4KbWFpbl9sMTY6CnR4biBPbkNvbXBsZXRpb24KaW50Y18wIC8vIE5vT3AKPT0KYm56IG1haW5fbDIwCnR4biBPbkNvbXBsZXRpb24KcHVzaGludCA1IC8vIERlbGV0ZUFwcGxpY2F0aW9uCj09CmJueiBtYWluX2wxOQplcnIKbWFpbl9sMTk6CnR4biBBcHBsaWNhdGlvbklECmludGNfMCAvLyAwCiE9CmFzc2VydApjYWxsc3ViIGRlbGV0ZV82CmludGNfMSAvLyAxCnJldHVybgptYWluX2wyMDoKdHhuIEFwcGxpY2F0aW9uSUQKaW50Y18wIC8vIDAKPT0KYXNzZXJ0CmNhbGxzdWIgY3JlYXRlXzIKaW50Y18xIC8vIDEKcmV0dXJuCgovLyBpbnRfdG9fYXNjaWkKaW50dG9hc2NpaV8wOgpwcm90byAxIDEKcHVzaGJ5dGVzIDB4MzAzMTMyMzMzNDM1MzYzNzM4MzkgLy8gIjAxMjM0NTY3ODkiCmZyYW1lX2RpZyAtMQppbnRjXzEgLy8gMQpleHRyYWN0MwpyZXRzdWIKCi8vIGl0b2EKaXRvYV8xOgpwcm90byAxIDEKZnJhbWVfZGlnIC0xCmludGNfMCAvLyAwCj09CmJueiBpdG9hXzFfbDUKZnJhbWVfZGlnIC0xCmludGNfMiAvLyAxMAovCmludGNfMCAvLyAwCj4KYm56IGl0b2FfMV9sNApieXRlY18yIC8vICIiCml0b2FfMV9sMzoKZnJhbWVfZGlnIC0xCmludGNfMiAvLyAxMAolCmNhbGxzdWIgaW50dG9hc2NpaV8wCmNvbmNhdApiIGl0b2FfMV9sNgppdG9hXzFfbDQ6CmZyYW1lX2RpZyAtMQppbnRjXzIgLy8gMTAKLwpjYWxsc3ViIGl0b2FfMQpiIGl0b2FfMV9sMwppdG9hXzFfbDU6CnB1c2hieXRlcyAweDMwIC8vICIwIgppdG9hXzFfbDY6CnJldHN1YgoKLy8gY3JlYXRlCmNyZWF0ZV8yOgpwcm90byAwIDAKYnl0ZWMgNSAvLyAic3ViX25hbWUiCnB1c2hieXRlcyAweDY0NjU2NjYxNzU2Yzc0IC8vICJkZWZhdWx0IgphcHBfZ2xvYmFsX3B1dApieXRlY18xIC8vICJzdWJfbWFuYWdlciIKZ2xvYmFsIENyZWF0b3JBZGRyZXNzCmFwcF9nbG9iYWxfcHV0CmJ5dGVjXzMgLy8gInN1Yl9wcmljZSIKaW50Y18wIC8vIDAKYXBwX2dsb2JhbF9wdXQKYnl0ZWNfMCAvLyAic3ViX3RvdGFsX2l0ZW1zIgppbnRjXzAgLy8gMAphcHBfZ2xvYmFsX3B1dApieXRlYyA0IC8vICJzdWJfbWF4X2l0ZW1zIgppbnRjXzAgLy8gMAphcHBfZ2xvYmFsX3B1dApieXRlYyA3IC8vICJzdWJfYXNhX2lkIgppbnRjXzAgLy8gMAphcHBfZ2xvYmFsX3B1dApieXRlYyA2IC8vICJzdWJfdHlwZSIKcHVzaGJ5dGVzIDB4NzU2ZTZjNjk2ZDY5NzQ2NTY0IC8vICJ1bmxpbWl0ZWQiCmFwcF9nbG9iYWxfcHV0CmJ5dGVjIDggLy8gInN1Yl9leHBpcmF0aW9uX3RpbWVzdGFtcCIKaW50Y18wIC8vIDAKYXBwX2dsb2JhbF9wdXQKcmV0c3ViCgovLyBhdXRoX29ubHkKYXV0aG9ubHlfMzoKcHJvdG8gMSAxCmZyYW1lX2RpZyAtMQpieXRlY18xIC8vICJzdWJfbWFuYWdlciIKYXBwX2dsb2JhbF9nZXQKPT0KcmV0c3ViCgovLyBhdXRoX29ubHkKYXV0aG9ubHlfNDoKcHJvdG8gMSAxCmZyYW1lX2RpZyAtMQpieXRlY18xIC8vICJzdWJfbWFuYWdlciIKYXBwX2dsb2JhbF9nZXQKPT0KcmV0c3ViCgovLyBhdXRoX29ubHkKYXV0aG9ubHlfNToKcHJvdG8gMSAxCmZyYW1lX2RpZyAtMQpieXRlY18xIC8vICJzdWJfbWFuYWdlciIKYXBwX2dsb2JhbF9nZXQKPT0KcmV0c3ViCgovLyBkZWxldGUKZGVsZXRlXzY6CnByb3RvIDAgMAp0eG4gU2VuZGVyCmNhbGxzdWIgYXV0aG9ubHlfNQovLyB1bmF1dGhvcml6ZWQKYXNzZXJ0CmJ5dGVjXzAgLy8gInN1Yl90b3RhbF9pdGVtcyIKYXBwX2dsb2JhbF9nZXQKaW50Y18wIC8vIDAKPT0KLy8gQWN0aXZlIHN1YnNjcmlwdG9ucyBleGlzdC4gRGVsZXRlIHRoZW0gZmlyc3QuCmFzc2VydApyZXRzdWIKCi8vIGlubmVyX2NyZWF0ZV9uZnQKaW5uZXJjcmVhdGVuZnRfNzoKcHJvdG8gMyAxCml0eG5fYmVnaW4KcHVzaGludCAzIC8vIGFjZmcKaXR4bl9maWVsZCBUeXBlRW51bQppbnRjXzEgLy8gMQppdHhuX2ZpZWxkIENvbmZpZ0Fzc2V0VG90YWwKaW50Y18wIC8vIDAKaXR4bl9maWVsZCBDb25maWdBc3NldERlY2ltYWxzCmludGNfMSAvLyAxCml0eG5fZmllbGQgQ29uZmlnQXNzZXREZWZhdWx0RnJvemVuCmZyYW1lX2RpZyAtMgppdHhuX2ZpZWxkIENvbmZpZ0Fzc2V0VW5pdE5hbWUKZnJhbWVfZGlnIC0zCml0eG5fZmllbGQgQ29uZmlnQXNzZXROYW1lCmZyYW1lX2RpZyAtMQppdHhuX2ZpZWxkIENvbmZpZ0Fzc2V0VVJMCmdsb2JhbCBDdXJyZW50QXBwbGljYXRpb25BZGRyZXNzCml0eG5fZmllbGQgQ29uZmlnQXNzZXRNYW5hZ2VyCmdsb2JhbCBDdXJyZW50QXBwbGljYXRpb25BZGRyZXNzCml0eG5fZmllbGQgQ29uZmlnQXNzZXRSZXNlcnZlCmdsb2JhbCBDdXJyZW50QXBwbGljYXRpb25BZGRyZXNzCml0eG5fZmllbGQgQ29uZmlnQXNzZXRGcmVlemUKZ2xvYmFsIEN1cnJlbnRBcHBsaWNhdGlvbkFkZHJlc3MKaXR4bl9maWVsZCBDb25maWdBc3NldENsYXdiYWNrCmludGNfMCAvLyAwCml0eG5fZmllbGQgRmVlCml0eG5fc3VibWl0Cml0eG4gQ3JlYXRlZEFzc2V0SUQKcmV0c3ViCgovLyBpbm5lcl90cmFuc2Zlcl9uZnQKaW5uZXJ0cmFuc2Zlcm5mdF84Ogpwcm90byAzIDAKaXR4bl9iZWdpbgpwdXNoaW50IDQgLy8gYXhmZXIKaXR4bl9maWVsZCBUeXBlRW51bQpmcmFtZV9kaWcgLTMKaXR4bl9maWVsZCBYZmVyQXNzZXQKaW50Y18xIC8vIDEKaXR4bl9maWVsZCBBc3NldEFtb3VudApmcmFtZV9kaWcgLTIKaXR4bl9maWVsZCBBc3NldFNlbmRlcgpmcmFtZV9kaWcgLTEKaXR4bl9maWVsZCBBc3NldFJlY2VpdmVyCmludGNfMCAvLyAwCml0eG5fZmllbGQgRmVlCml0eG5fc3VibWl0CnJldHN1YgoKLy8gaW5uZXJfZGVsZXRlX25mdAppbm5lcmRlbGV0ZW5mdF85Ogpwcm90byAxIDAKaXR4bl9iZWdpbgpwdXNoaW50IDMgLy8gYWNmZwppdHhuX2ZpZWxkIFR5cGVFbnVtCmZyYW1lX2RpZyAtMQppdHhuX2ZpZWxkIENvbmZpZ0Fzc2V0Cml0eG5fc3VibWl0CnJldHN1YgoKLy8gdXBkYXRlX2NvbmZpZwp1cGRhdGVjb25maWdfMTA6CnByb3RvIDcgMAp0eG4gU2VuZGVyCmNhbGxzdWIgYXV0aG9ubHlfMwovLyB1bmF1dGhvcml6ZWQKYXNzZXJ0CmZyYW1lX2RpZyAtNwpndHhucyBBbW91bnQKcHVzaGludCAxMTAwMDAgLy8gMTEwMDAwCj09CmFzc2VydApieXRlYyA1IC8vICJzdWJfbmFtZSIKZnJhbWVfZGlnIC02CmV4dHJhY3QgMiAwCmFwcF9nbG9iYWxfcHV0CmJ5dGVjIDYgLy8gInN1Yl90eXBlIgpmcmFtZV9kaWcgLTUKZXh0cmFjdCAyIDAKYXBwX2dsb2JhbF9wdXQKYnl0ZWNfMyAvLyAic3ViX3ByaWNlIgpmcmFtZV9kaWcgLTQKYXBwX2dsb2JhbF9wdXQKYnl0ZWMgNCAvLyAic3ViX21heF9pdGVtcyIKZnJhbWVfZGlnIC0zCmFwcF9nbG9iYWxfcHV0CmJ5dGVjIDcgLy8gInN1Yl9hc2FfaWQiCmZyYW1lX2RpZyAtMgphcHBfZ2xvYmFsX3B1dApieXRlYyA4IC8vICJzdWJfZXhwaXJhdGlvbl90aW1lc3RhbXAiCmZyYW1lX2RpZyAtMQphcHBfZ2xvYmFsX3B1dApyZXRzdWIKCi8vIHVwZGF0ZV9tYW5hZ2VyCnVwZGF0ZW1hbmFnZXJfMTE6CnByb3RvIDEgMAp0eG4gU2VuZGVyCmNhbGxzdWIgYXV0aG9ubHlfNAovLyB1bmF1dGhvcml6ZWQKYXNzZXJ0CmJ5dGVjXzEgLy8gInN1Yl9tYW5hZ2VyIgpmcmFtZV9kaWcgLTEKYXBwX2dsb2JhbF9wdXQKcmV0c3ViCgovLyBzdWJzY3JpYmUKc3Vic2NyaWJlXzEyOgpwcm90byAzIDAKYnl0ZWNfMiAvLyAiIgppbnRjXzAgLy8gMApkdXBuIDIKYnl0ZWNfMiAvLyAiIgppbnRjXzAgLy8gMApkdXAKYnl0ZWNfMiAvLyAiIgpkdXAKZnJhbWVfZGlnIC0yCmd0eG5zIFR5cGVFbnVtCmludGNfMSAvLyBwYXkKPT0KZnJhbWVfZGlnIC0yCmd0eG5zIEFtb3VudApieXRlY18zIC8vICJzdWJfcHJpY2UiCmFwcF9nbG9iYWxfZ2V0Cj09CiYmCmZyYW1lX2RpZyAtMgpndHhucyBSZWNlaXZlcgpieXRlY18xIC8vICJzdWJfbWFuYWdlciIKYXBwX2dsb2JhbF9nZXQKPT0KJiYKZnJhbWVfZGlnIC0yCmd0eG5zIFR5cGVFbnVtCnB1c2hpbnQgNCAvLyBheGZlcgo9PQpmcmFtZV9kaWcgLTIKZ3R4bnMgQXNzZXRSZWNlaXZlcgpieXRlY18xIC8vICJzdWJfbWFuYWdlciIKYXBwX2dsb2JhbF9nZXQKPT0KJiYKZnJhbWVfZGlnIC0yCmd0eG5zIEFzc2V0QW1vdW50CmJ5dGVjXzMgLy8gInN1Yl9wcmljZSIKYXBwX2dsb2JhbF9nZXQKPT0KJiYKfHwKYXNzZXJ0CmJ5dGVjIDQgLy8gInN1Yl9tYXhfaXRlbXMiCmFwcF9nbG9iYWxfZ2V0CmludGNfMCAvLyAwCj4KYnogc3Vic2NyaWJlXzEyX2wyCmJ5dGVjXzAgLy8gInN1Yl90b3RhbF9pdGVtcyIKYXBwX2dsb2JhbF9nZXQKYnl0ZWMgNCAvLyAic3ViX21heF9pdGVtcyIKYXBwX2dsb2JhbF9nZXQKPD0KLy8gTWF4IGl0ZW1zIHJlYWNoZWQKYXNzZXJ0CnN1YnNjcmliZV8xMl9sMjoKYnl0ZWNfMCAvLyAic3ViX3RvdGFsX2l0ZW1zIgpieXRlY18wIC8vICJzdWJfdG90YWxfaXRlbXMiCmFwcF9nbG9iYWxfZ2V0CmludGNfMSAvLyAxCisKYXBwX2dsb2JhbF9wdXQKcHVzaGJ5dGVzIDB4MjMgLy8gIiMiCmJ5dGVjXzAgLy8gInN1Yl90b3RhbF9pdGVtcyIKYXBwX2dsb2JhbF9nZXQKY2FsbHN1YiBpdG9hXzEKY29uY2F0CnB1c2hieXRlcyAweDIwMmQyMCAvLyAiIC0gIgpjb25jYXQKYnl0ZWMgNSAvLyAic3ViX25hbWUiCmFwcF9nbG9iYWxfZ2V0CmNvbmNhdApwdXNoYnl0ZXMgMHg1MzU0NTAgLy8gIlNUUCIKcHVzaGJ5dGVzIDB4Njk3MDY2NzMzYTJmMmY2MjYxNjY3OTYyNjU2OTYzNjQ2NDdhMzc2YjYyNzU3ODYxNmE2YTM2NjI2ZjYyMzU2MjZhNzE3NDc3NjU3MTM2Nzc2MzY4NmI2NDZiNjk3MTM0NzY3NjY4Nzc3Mjc3NzI2ZTY1Mzc2OTdhMzQ2NjMyMzU3ODY5IC8vICJpcGZzOi8vYmFmeWJlaWNkZHo3a2J1eGFqajZib2I1YmpxdHdlcTZ3Y2hrZGtpcTR2dmh3cndybmU3aXo0ZjI1eGkiCmNhbGxzdWIgaW5uZXJjcmVhdGVuZnRfNwpzdG9yZSAxMgpsb2FkIDEyCmludGNfMCAvLyAwCiE9CmFzc2VydApieXRlYyA2IC8vICJzdWJfdHlwZSIKYXBwX2dsb2JhbF9nZXQKZnJhbWVfYnVyeSAwCmZyYW1lX2RpZyAwCmxlbgppdG9iCmV4dHJhY3QgNiAwCmZyYW1lX2RpZyAwCmNvbmNhdApmcmFtZV9idXJ5IDAKbG9hZCAxMgpmcmFtZV9idXJ5IDEKZ2xvYmFsIExhdGVzdFRpbWVzdGFtcApmcmFtZV9idXJ5IDIKZ2xvYmFsIExhdGVzdFRpbWVzdGFtcApmcmFtZV9idXJ5IDMKZnJhbWVfZGlnIDAKZnJhbWVfYnVyeSA4CmZyYW1lX2RpZyA4CmZyYW1lX2J1cnkgNwpwdXNoaW50IDI2IC8vIDI2CmZyYW1lX2J1cnkgNQpmcmFtZV9kaWcgNQppdG9iCmV4dHJhY3QgNiAwCmZyYW1lX2RpZyAxCml0b2IKY29uY2F0CmZyYW1lX2RpZyAyCml0b2IKY29uY2F0CmZyYW1lX2RpZyAzCml0b2IKY29uY2F0CmZyYW1lX2RpZyA3CmNvbmNhdApmcmFtZV9idXJ5IDQKZnJhbWVfZGlnIC0xCnR4bmFzIEFjY291bnRzCmJveF9kZWwKcG9wCmZyYW1lX2RpZyAtMQp0eG5hcyBBY2NvdW50cwpmcmFtZV9kaWcgNApib3hfcHV0CnJldHN1YgoKLy8gZ2V0X3N1YnNjcmlwdGlvbgpnZXRzdWJzY3JpcHRpb25fMTM6CnByb3RvIDIgMApmcmFtZV9kaWcgLTIKYm94X2dldApzdG9yZSAxNApzdG9yZSAxMwpsb2FkIDE0CmFzc2VydApsb2FkIDEzCmZyYW1lX2J1cnkgLTEKcmV0c3ViCgovLyBjbGFpbV9zdWJzY3JpcHRpb24KY2xhaW1zdWJzY3JpcHRpb25fMTQ6CnByb3RvIDAgMAp0eG4gU2VuZGVyCnR4bmEgQXNzZXRzIDAKYXNzZXRfaG9sZGluZ19nZXQgQXNzZXRCYWxhbmNlCnN0b3JlIDE2CnN0b3JlIDE1CmxvYWQgMTYKLy8gU3Vic2NyaWJlciBub3Qgb3B0ZWQtaW4gZm9yIFN1YnNjcmlwdGlvbiBORlQKYXNzZXJ0CnR4bmEgQXNzZXRzIDAKZ2xvYmFsIEN1cnJlbnRBcHBsaWNhdGlvbkFkZHJlc3MKdHhuIFNlbmRlcgpjYWxsc3ViIGlubmVydHJhbnNmZXJuZnRfOApyZXRzdWIKCi8vIHRyYW5zZmVyX3N1YnNjcmlwdGlvbgp0cmFuc2ZlcnN1YnNjcmlwdGlvbl8xNToKcHJvdG8gMSAwCmJ5dGVjXzIgLy8gIiIKZHVwCmludGNfMCAvLyAwCmR1cG4gNApieXRlY18yIC8vICIiCmR1cAp0eG4gU2VuZGVyCmJveF9nZXQKc3RvcmUgMTgKc3RvcmUgMTcKbG9hZCAxOAovLyBDdXJyZW50IGFkZHJlc3Mgbm90IHN1YnNjcmliZWQKYXNzZXJ0CnR4bmEgQXNzZXRzIDAKdHhuIFNlbmRlcgpnbG9iYWwgQ3VycmVudEFwcGxpY2F0aW9uQWRkcmVzcwpjYWxsc3ViIGlubmVydHJhbnNmZXJuZnRfOAp0eG4gU2VuZGVyCmJveF9nZXQKc3RvcmUgMjAKc3RvcmUgMTkKbG9hZCAyMAphc3NlcnQKbG9hZCAxOQpmcmFtZV9idXJ5IDAKZnJhbWVfZGlnIDAKZnJhbWVfZGlnIDAKaW50Y18wIC8vIDAKZXh0cmFjdF91aW50MTYKZGlnIDEKbGVuCnN1YnN0cmluZzMKZnJhbWVfYnVyeSAxCmZyYW1lX2RpZyAwCmludGNfMyAvLyAyCmV4dHJhY3RfdWludDY0CmZyYW1lX2J1cnkgMgpmcmFtZV9kaWcgMAppbnRjXzIgLy8gMTAKZXh0cmFjdF91aW50NjQKZnJhbWVfYnVyeSAzCmdsb2JhbCBMYXRlc3RUaW1lc3RhbXAKZnJhbWVfYnVyeSA0CmZyYW1lX2RpZyAxCmZyYW1lX2J1cnkgOApmcmFtZV9kaWcgOApmcmFtZV9idXJ5IDcKcHVzaGludCAyNiAvLyAyNgpmcmFtZV9idXJ5IDUKZnJhbWVfZGlnIDUKaXRvYgpleHRyYWN0IDYgMApmcmFtZV9kaWcgMgppdG9iCmNvbmNhdApmcmFtZV9kaWcgMwppdG9iCmNvbmNhdApmcmFtZV9kaWcgNAppdG9iCmNvbmNhdApmcmFtZV9kaWcgNwpjb25jYXQKZnJhbWVfYnVyeSAwCmZyYW1lX2RpZyAtMQpib3hfZGVsCnBvcApmcmFtZV9kaWcgLTEKZnJhbWVfZGlnIDAKYm94X3B1dAp0eG4gU2VuZGVyCmJveF9kZWwKcG9wCnJldHN1YgoKLy8gZGVsZXRlX3N1YnNjcmlwdGlvbgpkZWxldGVzdWJzY3JpcHRpb25fMTY6CnByb3RvIDAgMAp0eG4gU2VuZGVyCnR4bmEgQXNzZXRzIDAKYXNzZXRfaG9sZGluZ19nZXQgQXNzZXRCYWxhbmNlCnN0b3JlIDIyCnN0b3JlIDIxCmxvYWQgMjIKYm56IGRlbGV0ZXN1YnNjcmlwdGlvbl8xNl9sMwpkZWxldGVzdWJzY3JpcHRpb25fMTZfbDE6CnR4bmEgQXNzZXRzIDAKY2FsbHN1YiBpbm5lcmRlbGV0ZW5mdF85CmJ5dGVjXzAgLy8gInN1Yl90b3RhbF9pdGVtcyIKYXBwX2dsb2JhbF9nZXQKaW50Y18wIC8vIDAKIT0KYnogZGVsZXRlc3Vic2NyaXB0aW9uXzE2X2w0CmJ5dGVjXzAgLy8gInN1Yl90b3RhbF9pdGVtcyIKYnl0ZWNfMCAvLyAic3ViX3RvdGFsX2l0ZW1zIgphcHBfZ2xvYmFsX2dldAppbnRjXzEgLy8gMQotCmFwcF9nbG9iYWxfcHV0CmIgZGVsZXRlc3Vic2NyaXB0aW9uXzE2X2w0CmRlbGV0ZXN1YnNjcmlwdGlvbl8xNl9sMzoKdHhuYSBBc3NldHMgMAp0eG4gU2VuZGVyCmdsb2JhbCBDdXJyZW50QXBwbGljYXRpb25BZGRyZXNzCmNhbGxzdWIgaW5uZXJ0cmFuc2Zlcm5mdF84CmIgZGVsZXRlc3Vic2NyaXB0aW9uXzE2X2wxCmRlbGV0ZXN1YnNjcmlwdGlvbl8xNl9sNDoKdHhuIFNlbmRlcgpib3hfZGVsCnBvcApyZXRzdWI=";
  override clearProgram =
    "I3ByYWdtYSB2ZXJzaW9uIDgKcHVzaGludCAwIC8vIDAKcmV0dXJu";
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
  async subscribe(
    args: {
      box_fee_txn: TransactionWithSigner | Transaction;
      subscribe_pay_txn: TransactionWithSigner | Transaction;
      subscriber_account: string;
    },
    txnParams?: TransactionOverrides
  ): Promise<ABIResult<void>> {
    const result = await this.execute(
      await this.compose.subscribe(
        {
          box_fee_txn: args.box_fee_txn,
          subscribe_pay_txn: args.subscribe_pay_txn,
          subscriber_account: args.subscriber_account,
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
