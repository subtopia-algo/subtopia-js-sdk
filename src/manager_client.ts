import algosdk from "algosdk";
import * as bkr from "beaker-ts";
import { State } from "beaker-ts";
import loadApplicationState from "utils";
export class SubtopiaSubscription {
  sub_type = "";
  sub_id = BigInt(0);
  created_at_timestamp = BigInt(0);
  static codec: algosdk.ABIType = algosdk.ABIType.from(
    "(string,uint64,uint64)"
  );
  static fields: string[] = ["sub_type", "sub_id", "created_at_timestamp"];
  static decodeResult(val: algosdk.ABIValue | undefined): SubtopiaSubscription {
    return bkr.decodeNamedTuple(
      val,
      SubtopiaSubscription.fields
    ) as SubtopiaSubscription;
  }
  static decodeBytes(val: Uint8Array): SubtopiaSubscription {
    return bkr.decodeNamedTuple(
      SubtopiaSubscription.codec.decode(val),
      SubtopiaSubscription.fields
    ) as SubtopiaSubscription;
  }
}
export class Manager extends bkr.ApplicationClient {
  desc = "";
  override appSchema: bkr.Schema = {
    declared: {
      name: { type: bkr.AVMType.bytes, key: "name", desc: "", static: false },
      manager: {
        type: bkr.AVMType.bytes,
        key: "manager",
        desc: "",
        static: false,
      },
      price: {
        type: bkr.AVMType.uint64,
        key: "price",
        desc: "",
        static: false,
      },
      total_subs: {
        type: bkr.AVMType.uint64,
        key: "total_subs",
        desc: "",
        static: false,
      },
      max_subs: {
        type: bkr.AVMType.uint64,
        key: "max_subs",
        desc: "",
        static: false,
      },
      coin_id: {
        type: bkr.AVMType.uint64,
        key: "coin_id",
        desc: "",
        static: false,
      },
      sub_type: {
        type: bkr.AVMType.bytes,
        key: "sub_type",
        desc: "",
        static: false,
      },
      expires_at: {
        type: bkr.AVMType.uint64,
        key: "expires_at",
        desc: "",
        static: false,
      },
    },
    reserved: {},
  };
  override acctSchema: bkr.Schema = { declared: {}, reserved: {} };
  override approvalProgram =
    "I3ByYWdtYSB2ZXJzaW9uIDgKaW50Y2Jsb2NrIDAgMSAxMCAyCmJ5dGVjYmxvY2sgMHg3NDZmNzQ2MTZjNWY3Mzc1NjI3MyAweCAweDZkNjE2ZTYxNjc2NTcyIDB4NzA3MjY5NjM2NSAweDZkNjE3ODVmNzM3NTYyNzMgMHg2ZTYxNmQ2NSAweDczNzU2MjVmNzQ3OTcwNjUgMHg2MzZmNjk2ZTVmNjk2NCAweDY1Nzg3MDY5NzI2NTczNWY2MTc0CnR4biBOdW1BcHBBcmdzCmludGNfMCAvLyAwCj09CmJueiBtYWluX2wxOAp0eG5hIEFwcGxpY2F0aW9uQXJncyAwCnB1c2hieXRlcyAweDNkZmNlNmJlIC8vICJ1cGRhdGVfY29uZmlnKHBheSxzdHJpbmcsc3RyaW5nLHVpbnQ2NCx1aW50NjQsdWludDY0LHVpbnQ2NCl2b2lkIgo9PQpibnogbWFpbl9sMTcKdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMApwdXNoYnl0ZXMgMHhjODZmZGIwMSAvLyAidXBkYXRlX21hbmFnZXIoYWRkcmVzcyl2b2lkIgo9PQpibnogbWFpbl9sMTYKdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMApwdXNoYnl0ZXMgMHgxODJlMzY3OSAvLyAic3Vic2NyaWJlKHBheSx0eG4sYWNjb3VudCl2b2lkIgo9PQpibnogbWFpbl9sMTUKdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMApwdXNoYnl0ZXMgMHg4OWVhZTVlZSAvLyAiZ2V0X3N1YnNjcmlwdGlvbihhZGRyZXNzKShzdHJpbmcsdWludDY0LHVpbnQ2NCkiCj09CmJueiBtYWluX2wxNAp0eG5hIEFwcGxpY2F0aW9uQXJncyAwCnB1c2hieXRlcyAweDI2OTYzODk2IC8vICJjbGFpbV9zdWJzY3JpcHRpb24oKXZvaWQiCj09CmJueiBtYWluX2wxMwp0eG5hIEFwcGxpY2F0aW9uQXJncyAwCnB1c2hieXRlcyAweGMwN2Y3NmZiIC8vICJ0cmFuc2Zlcl9zdWJzY3JpcHRpb24oYWRkcmVzcyl2b2lkIgo9PQpibnogbWFpbl9sMTIKdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMApwdXNoYnl0ZXMgMHhmOWEzYzI0YSAvLyAidW5zdWJzY3JpYmUoKXZvaWQiCj09CmJueiBtYWluX2wxMQp0eG5hIEFwcGxpY2F0aW9uQXJncyAwCnB1c2hieXRlcyAweGE0MzRlNDJjIC8vICJkZWxldGVfc3Vic2NyaXB0aW9uKGFkZHJlc3Mpdm9pZCIKPT0KYm56IG1haW5fbDEwCmVycgptYWluX2wxMDoKdHhuIE9uQ29tcGxldGlvbgppbnRjXzAgLy8gTm9PcAo9PQp0eG4gQXBwbGljYXRpb25JRAppbnRjXzAgLy8gMAohPQomJgphc3NlcnQKdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMQpjYWxsc3ViIGRlbGV0ZXN1YnNjcmlwdGlvbl8yMAppbnRjXzEgLy8gMQpyZXR1cm4KbWFpbl9sMTE6CnR4biBPbkNvbXBsZXRpb24KaW50Y18wIC8vIE5vT3AKPT0KdHhuIEFwcGxpY2F0aW9uSUQKaW50Y18wIC8vIDAKIT0KJiYKYXNzZXJ0CmNhbGxzdWIgdW5zdWJzY3JpYmVfMTkKaW50Y18xIC8vIDEKcmV0dXJuCm1haW5fbDEyOgp0eG4gT25Db21wbGV0aW9uCmludGNfMCAvLyBOb09wCj09CnR4biBBcHBsaWNhdGlvbklECmludGNfMCAvLyAwCiE9CiYmCmFzc2VydAp0eG5hIEFwcGxpY2F0aW9uQXJncyAxCmNhbGxzdWIgdHJhbnNmZXJzdWJzY3JpcHRpb25fMTgKaW50Y18xIC8vIDEKcmV0dXJuCm1haW5fbDEzOgp0eG4gT25Db21wbGV0aW9uCmludGNfMCAvLyBOb09wCj09CnR4biBBcHBsaWNhdGlvbklECmludGNfMCAvLyAwCiE9CiYmCmFzc2VydApjYWxsc3ViIGNsYWltc3Vic2NyaXB0aW9uXzE3CmludGNfMSAvLyAxCnJldHVybgptYWluX2wxNDoKdHhuIE9uQ29tcGxldGlvbgppbnRjXzAgLy8gTm9PcAo9PQp0eG4gQXBwbGljYXRpb25JRAppbnRjXzAgLy8gMAohPQomJgphc3NlcnQKdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMQpjYWxsc3ViIGdldHN1YnNjcmlwdGlvbl8xNgpzdG9yZSAxMApwdXNoYnl0ZXMgMHgxNTFmN2M3NSAvLyAweDE1MWY3Yzc1CmxvYWQgMTAKY29uY2F0CmxvZwppbnRjXzEgLy8gMQpyZXR1cm4KbWFpbl9sMTU6CnR4biBPbkNvbXBsZXRpb24KaW50Y18wIC8vIE5vT3AKPT0KdHhuIEFwcGxpY2F0aW9uSUQKaW50Y18wIC8vIDAKIT0KJiYKYXNzZXJ0CnR4bmEgQXBwbGljYXRpb25BcmdzIDEKaW50Y18wIC8vIDAKZ2V0Ynl0ZQpzdG9yZSA5CnR4biBHcm91cEluZGV4CmludGNfMyAvLyAyCi0Kc3RvcmUgNwpsb2FkIDcKZ3R4bnMgVHlwZUVudW0KaW50Y18xIC8vIHBheQo9PQphc3NlcnQKdHhuIEdyb3VwSW5kZXgKaW50Y18xIC8vIDEKLQpzdG9yZSA4CmxvYWQgNwpsb2FkIDgKbG9hZCA5CmNhbGxzdWIgc3Vic2NyaWJlXzE1CmludGNfMSAvLyAxCnJldHVybgptYWluX2wxNjoKdHhuIE9uQ29tcGxldGlvbgppbnRjXzAgLy8gTm9PcAo9PQp0eG4gQXBwbGljYXRpb25JRAppbnRjXzAgLy8gMAohPQomJgphc3NlcnQKdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMQpjYWxsc3ViIHVwZGF0ZW1hbmFnZXJfMTQKaW50Y18xIC8vIDEKcmV0dXJuCm1haW5fbDE3Ogp0eG4gT25Db21wbGV0aW9uCmludGNfMCAvLyBOb09wCj09CnR4biBBcHBsaWNhdGlvbklECmludGNfMCAvLyAwCiE9CiYmCmFzc2VydAp0eG5hIEFwcGxpY2F0aW9uQXJncyAxCnN0b3JlIDEKdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMgpzdG9yZSAyCnR4bmEgQXBwbGljYXRpb25BcmdzIDMKYnRvaQpzdG9yZSAzCnR4bmEgQXBwbGljYXRpb25BcmdzIDQKYnRvaQpzdG9yZSA0CnR4bmEgQXBwbGljYXRpb25BcmdzIDUKYnRvaQpzdG9yZSA1CnR4bmEgQXBwbGljYXRpb25BcmdzIDYKYnRvaQpzdG9yZSA2CnR4biBHcm91cEluZGV4CmludGNfMSAvLyAxCi0Kc3RvcmUgMApsb2FkIDAKZ3R4bnMgVHlwZUVudW0KaW50Y18xIC8vIHBheQo9PQphc3NlcnQKbG9hZCAwCmxvYWQgMQpsb2FkIDIKbG9hZCAzCmxvYWQgNApsb2FkIDUKbG9hZCA2CmNhbGxzdWIgdXBkYXRlY29uZmlnXzEzCmludGNfMSAvLyAxCnJldHVybgptYWluX2wxODoKdHhuIE9uQ29tcGxldGlvbgppbnRjXzAgLy8gTm9PcAo9PQpibnogbWFpbl9sMjQKdHhuIE9uQ29tcGxldGlvbgppbnRjXzEgLy8gT3B0SW4KPT0KYm56IG1haW5fbDIzCnR4biBPbkNvbXBsZXRpb24KcHVzaGludCA1IC8vIERlbGV0ZUFwcGxpY2F0aW9uCj09CmJueiBtYWluX2wyMgplcnIKbWFpbl9sMjI6CnR4biBBcHBsaWNhdGlvbklECmludGNfMCAvLyAwCiE9CmFzc2VydApjYWxsc3ViIGRlbGV0ZV84CmludGNfMSAvLyAxCnJldHVybgptYWluX2wyMzoKdHhuIEFwcGxpY2F0aW9uSUQKaW50Y18wIC8vIDAKIT0KYXNzZXJ0CmNhbGxzdWIgb3B0aW5fMwppbnRjXzEgLy8gMQpyZXR1cm4KbWFpbl9sMjQ6CnR4biBBcHBsaWNhdGlvbklECmludGNfMCAvLyAwCj09CmFzc2VydApjYWxsc3ViIGNyZWF0ZV8yCmludGNfMSAvLyAxCnJldHVybgoKLy8gaW50X3RvX2FzY2lpCmludHRvYXNjaWlfMDoKcHJvdG8gMSAxCnB1c2hieXRlcyAweDMwMzEzMjMzMzQzNTM2MzczODM5IC8vICIwMTIzNDU2Nzg5IgpmcmFtZV9kaWcgLTEKaW50Y18xIC8vIDEKZXh0cmFjdDMKcmV0c3ViCgovLyBpdG9hCml0b2FfMToKcHJvdG8gMSAxCmZyYW1lX2RpZyAtMQppbnRjXzAgLy8gMAo9PQpibnogaXRvYV8xX2w1CmZyYW1lX2RpZyAtMQppbnRjXzIgLy8gMTAKLwppbnRjXzAgLy8gMAo+CmJueiBpdG9hXzFfbDQKYnl0ZWNfMSAvLyAiIgppdG9hXzFfbDM6CmZyYW1lX2RpZyAtMQppbnRjXzIgLy8gMTAKJQpjYWxsc3ViIGludHRvYXNjaWlfMApjb25jYXQKYiBpdG9hXzFfbDYKaXRvYV8xX2w0OgpmcmFtZV9kaWcgLTEKaW50Y18yIC8vIDEwCi8KY2FsbHN1YiBpdG9hXzEKYiBpdG9hXzFfbDMKaXRvYV8xX2w1OgpwdXNoYnl0ZXMgMHgzMCAvLyAiMCIKaXRvYV8xX2w2OgpyZXRzdWIKCi8vIGNyZWF0ZQpjcmVhdGVfMjoKcHJvdG8gMCAwCmJ5dGVjIDUgLy8gIm5hbWUiCnB1c2hieXRlcyAweDY0NjU2NjYxNzU2Yzc0IC8vICJkZWZhdWx0IgphcHBfZ2xvYmFsX3B1dApieXRlY18yIC8vICJtYW5hZ2VyIgpnbG9iYWwgQ3JlYXRvckFkZHJlc3MKYXBwX2dsb2JhbF9wdXQKYnl0ZWNfMyAvLyAicHJpY2UiCmludGNfMCAvLyAwCmFwcF9nbG9iYWxfcHV0CmJ5dGVjXzAgLy8gInRvdGFsX3N1YnMiCmludGNfMCAvLyAwCmFwcF9nbG9iYWxfcHV0CmJ5dGVjIDQgLy8gIm1heF9zdWJzIgppbnRjXzAgLy8gMAphcHBfZ2xvYmFsX3B1dApieXRlYyA3IC8vICJjb2luX2lkIgppbnRjXzAgLy8gMAphcHBfZ2xvYmFsX3B1dApieXRlYyA2IC8vICJzdWJfdHlwZSIKcHVzaGJ5dGVzIDB4NzU2ZTZjNjk2ZDY5NzQ2NTY0IC8vICJ1bmxpbWl0ZWQiCmFwcF9nbG9iYWxfcHV0CmJ5dGVjIDggLy8gImV4cGlyZXNfYXQiCmludGNfMCAvLyAwCmFwcF9nbG9iYWxfcHV0CnJldHN1YgoKLy8gb3B0aW4Kb3B0aW5fMzoKcHJvdG8gMCAwCnJldHN1YgoKLy8gYXV0aF9vbmx5CmF1dGhvbmx5XzQ6CnByb3RvIDEgMQpmcmFtZV9kaWcgLTEKZ2xvYmFsIENyZWF0b3JBZGRyZXNzCj09CnJldHN1YgoKLy8gYXV0aF9vbmx5CmF1dGhvbmx5XzU6CnByb3RvIDEgMQpmcmFtZV9kaWcgLTEKYnl0ZWNfMiAvLyAibWFuYWdlciIKYXBwX2dsb2JhbF9nZXQKPT0KcmV0c3ViCgovLyBhdXRoX29ubHkKYXV0aG9ubHlfNjoKcHJvdG8gMSAxCmZyYW1lX2RpZyAtMQpieXRlY18yIC8vICJtYW5hZ2VyIgphcHBfZ2xvYmFsX2dldAo9PQpyZXRzdWIKCi8vIGF1dGhfb25seQphdXRob25seV83Ogpwcm90byAxIDEKZnJhbWVfZGlnIC0xCmJ5dGVjXzIgLy8gIm1hbmFnZXIiCmFwcF9nbG9iYWxfZ2V0Cj09CnJldHN1YgoKLy8gZGVsZXRlCmRlbGV0ZV84Ogpwcm90byAwIDAKdHhuIFNlbmRlcgpjYWxsc3ViIGF1dGhvbmx5XzcKLy8gdW5hdXRob3JpemVkCmFzc2VydApieXRlY18wIC8vICJ0b3RhbF9zdWJzIgphcHBfZ2xvYmFsX2dldAppbnRjXzAgLy8gMAo9PQovLyBBY3RpdmUgc3Vic2NyaXB0b25zIGV4aXN0LiBEZWxldGUgdGhlbSBmaXJzdC4KYXNzZXJ0CnJldHN1YgoKLy8gaW5uZXJfY3JlYXRlX25mdAppbm5lcmNyZWF0ZW5mdF85Ogpwcm90byAzIDEKaXR4bl9iZWdpbgpwdXNoaW50IDMgLy8gYWNmZwppdHhuX2ZpZWxkIFR5cGVFbnVtCmludGNfMSAvLyAxCml0eG5fZmllbGQgQ29uZmlnQXNzZXRUb3RhbAppbnRjXzAgLy8gMAppdHhuX2ZpZWxkIENvbmZpZ0Fzc2V0RGVjaW1hbHMKaW50Y18xIC8vIDEKaXR4bl9maWVsZCBDb25maWdBc3NldERlZmF1bHRGcm96ZW4KZnJhbWVfZGlnIC0yCml0eG5fZmllbGQgQ29uZmlnQXNzZXRVbml0TmFtZQpmcmFtZV9kaWcgLTMKaXR4bl9maWVsZCBDb25maWdBc3NldE5hbWUKZnJhbWVfZGlnIC0xCml0eG5fZmllbGQgQ29uZmlnQXNzZXRVUkwKZ2xvYmFsIEN1cnJlbnRBcHBsaWNhdGlvbkFkZHJlc3MKaXR4bl9maWVsZCBDb25maWdBc3NldE1hbmFnZXIKZ2xvYmFsIEN1cnJlbnRBcHBsaWNhdGlvbkFkZHJlc3MKaXR4bl9maWVsZCBDb25maWdBc3NldFJlc2VydmUKZ2xvYmFsIEN1cnJlbnRBcHBsaWNhdGlvbkFkZHJlc3MKaXR4bl9maWVsZCBDb25maWdBc3NldEZyZWV6ZQpnbG9iYWwgQ3VycmVudEFwcGxpY2F0aW9uQWRkcmVzcwppdHhuX2ZpZWxkIENvbmZpZ0Fzc2V0Q2xhd2JhY2sKaW50Y18wIC8vIDAKaXR4bl9maWVsZCBGZWUKaXR4bl9zdWJtaXQKaXR4biBDcmVhdGVkQXNzZXRJRApyZXRzdWIKCi8vIGlubmVyX3RyYW5zZmVyX25mdAppbm5lcnRyYW5zZmVybmZ0XzEwOgpwcm90byAzIDAKaXR4bl9iZWdpbgpwdXNoaW50IDQgLy8gYXhmZXIKaXR4bl9maWVsZCBUeXBlRW51bQpmcmFtZV9kaWcgLTMKaXR4bl9maWVsZCBYZmVyQXNzZXQKaW50Y18xIC8vIDEKaXR4bl9maWVsZCBBc3NldEFtb3VudApmcmFtZV9kaWcgLTIKaXR4bl9maWVsZCBBc3NldFNlbmRlcgpmcmFtZV9kaWcgLTEKaXR4bl9maWVsZCBBc3NldFJlY2VpdmVyCmludGNfMCAvLyAwCml0eG5fZmllbGQgRmVlCml0eG5fc3VibWl0CnJldHN1YgoKLy8gaW5uZXJfZGVsZXRlX25mdAppbm5lcmRlbGV0ZW5mdF8xMToKcHJvdG8gMSAwCml0eG5fYmVnaW4KcHVzaGludCAzIC8vIGFjZmcKaXR4bl9maWVsZCBUeXBlRW51bQpmcmFtZV9kaWcgLTEKaXR4bl9maWVsZCBDb25maWdBc3NldAppdHhuX3N1Ym1pdApyZXRzdWIKCi8vIGlubmVyX2RlbGV0ZV9zdWJzY3JpcHRpb24KaW5uZXJkZWxldGVzdWJzY3JpcHRpb25fMTI6CnByb3RvIDEgMApmcmFtZV9kaWcgLTEKdHhuYSBBc3NldHMgMAphc3NldF9ob2xkaW5nX2dldCBBc3NldEJhbGFuY2UKc3RvcmUgMjEKc3RvcmUgMjAKbG9hZCAyMQpibnogaW5uZXJkZWxldGVzdWJzY3JpcHRpb25fMTJfbDMKaW5uZXJkZWxldGVzdWJzY3JpcHRpb25fMTJfbDE6CnR4bmEgQXNzZXRzIDAKY2FsbHN1YiBpbm5lcmRlbGV0ZW5mdF8xMQpieXRlY18wIC8vICJ0b3RhbF9zdWJzIgphcHBfZ2xvYmFsX2dldAppbnRjXzAgLy8gMAohPQpieiBpbm5lcmRlbGV0ZXN1YnNjcmlwdGlvbl8xMl9sNApieXRlY18wIC8vICJ0b3RhbF9zdWJzIgpieXRlY18wIC8vICJ0b3RhbF9zdWJzIgphcHBfZ2xvYmFsX2dldAppbnRjXzEgLy8gMQotCmFwcF9nbG9iYWxfcHV0CmIgaW5uZXJkZWxldGVzdWJzY3JpcHRpb25fMTJfbDQKaW5uZXJkZWxldGVzdWJzY3JpcHRpb25fMTJfbDM6CnR4bmEgQXNzZXRzIDAKZnJhbWVfZGlnIC0xCmdsb2JhbCBDdXJyZW50QXBwbGljYXRpb25BZGRyZXNzCmNhbGxzdWIgaW5uZXJ0cmFuc2Zlcm5mdF8xMApiIGlubmVyZGVsZXRlc3Vic2NyaXB0aW9uXzEyX2wxCmlubmVyZGVsZXRlc3Vic2NyaXB0aW9uXzEyX2w0OgpmcmFtZV9kaWcgLTEKYm94X2RlbApwb3AKcmV0c3ViCgovLyB1cGRhdGVfY29uZmlnCnVwZGF0ZWNvbmZpZ18xMzoKcHJvdG8gNyAwCnR4biBTZW5kZXIKY2FsbHN1YiBhdXRob25seV80Ci8vIHVuYXV0aG9yaXplZAphc3NlcnQKZnJhbWVfZGlnIC03Cmd0eG5zIEFtb3VudApwdXNoaW50IDExMDAwMCAvLyAxMTAwMDAKPT0KYXNzZXJ0CmJ5dGVjIDUgLy8gIm5hbWUiCmZyYW1lX2RpZyAtNgpleHRyYWN0IDIgMAphcHBfZ2xvYmFsX3B1dApieXRlYyA2IC8vICJzdWJfdHlwZSIKZnJhbWVfZGlnIC01CmV4dHJhY3QgMiAwCmFwcF9nbG9iYWxfcHV0CmJ5dGVjXzMgLy8gInByaWNlIgpmcmFtZV9kaWcgLTQKYXBwX2dsb2JhbF9wdXQKYnl0ZWMgNCAvLyAibWF4X3N1YnMiCmZyYW1lX2RpZyAtMwphcHBfZ2xvYmFsX3B1dApieXRlYyA3IC8vICJjb2luX2lkIgpmcmFtZV9kaWcgLTIKYXBwX2dsb2JhbF9wdXQKYnl0ZWMgOCAvLyAiZXhwaXJlc19hdCIKZnJhbWVfZGlnIC0xCmFwcF9nbG9iYWxfcHV0CnJldHN1YgoKLy8gdXBkYXRlX21hbmFnZXIKdXBkYXRlbWFuYWdlcl8xNDoKcHJvdG8gMSAwCnR4biBTZW5kZXIKY2FsbHN1YiBhdXRob25seV81Ci8vIHVuYXV0aG9yaXplZAphc3NlcnQKYnl0ZWNfMiAvLyAibWFuYWdlciIKYXBwX2dsb2JhbF9nZXQKZnJhbWVfZGlnIC0xCiE9Ci8vIE5ldyBtYW5hZ2VyIGNhbm5vdCBiZSB0aGUgc2FtZSBhcyB0aGUgb2xkIG1hbmFnZXIKYXNzZXJ0CmJ5dGVjXzIgLy8gIm1hbmFnZXIiCmZyYW1lX2RpZyAtMQphcHBfZ2xvYmFsX3B1dApyZXRzdWIKCi8vIHN1YnNjcmliZQpzdWJzY3JpYmVfMTU6CnByb3RvIDMgMApieXRlY18xIC8vICIiCmludGNfMCAvLyAwCmR1cApieXRlY18xIC8vICIiCmludGNfMCAvLyAwCmR1cApieXRlY18xIC8vICIiCmR1cApmcmFtZV9kaWcgLTIKZ3R4bnMgVHlwZUVudW0KaW50Y18xIC8vIHBheQo9PQpmcmFtZV9kaWcgLTIKZ3R4bnMgQW1vdW50CmJ5dGVjXzMgLy8gInByaWNlIgphcHBfZ2xvYmFsX2dldAo9PQomJgpmcmFtZV9kaWcgLTIKZ3R4bnMgUmVjZWl2ZXIKYnl0ZWNfMiAvLyAibWFuYWdlciIKYXBwX2dsb2JhbF9nZXQKPT0KJiYKZnJhbWVfZGlnIC0yCmd0eG5zIFR5cGVFbnVtCnB1c2hpbnQgNCAvLyBheGZlcgo9PQpmcmFtZV9kaWcgLTIKZ3R4bnMgQXNzZXRSZWNlaXZlcgpieXRlY18yIC8vICJtYW5hZ2VyIgphcHBfZ2xvYmFsX2dldAo9PQomJgpmcmFtZV9kaWcgLTIKZ3R4bnMgQXNzZXRBbW91bnQKYnl0ZWNfMyAvLyAicHJpY2UiCmFwcF9nbG9iYWxfZ2V0Cj09CiYmCnx8CmFzc2VydApieXRlYyA0IC8vICJtYXhfc3VicyIKYXBwX2dsb2JhbF9nZXQKaW50Y18wIC8vIDAKPgpieiBzdWJzY3JpYmVfMTVfbDIKYnl0ZWNfMCAvLyAidG90YWxfc3VicyIKYXBwX2dsb2JhbF9nZXQKYnl0ZWMgNCAvLyAibWF4X3N1YnMiCmFwcF9nbG9iYWxfZ2V0Cjw9Ci8vIE1heCBpdGVtcyByZWFjaGVkCmFzc2VydApzdWJzY3JpYmVfMTVfbDI6CmJ5dGVjXzAgLy8gInRvdGFsX3N1YnMiCmJ5dGVjXzAgLy8gInRvdGFsX3N1YnMiCmFwcF9nbG9iYWxfZ2V0CmludGNfMSAvLyAxCisKYXBwX2dsb2JhbF9wdXQKcHVzaGJ5dGVzIDB4MjMgLy8gIiMiCmJ5dGVjXzAgLy8gInRvdGFsX3N1YnMiCmFwcF9nbG9iYWxfZ2V0CmNhbGxzdWIgaXRvYV8xCmNvbmNhdApwdXNoYnl0ZXMgMHgyMDJkMjAgLy8gIiAtICIKY29uY2F0CmJ5dGVjIDUgLy8gIm5hbWUiCmFwcF9nbG9iYWxfZ2V0CmNvbmNhdApwdXNoYnl0ZXMgMHg1MzU0NTAgLy8gIlNUUCIKcHVzaGJ5dGVzIDB4Njk3MDY2NzMzYTJmMmY2MjYxNjY3OTYyNjU2OTYzNjQ2NDdhMzc2YjYyNzU3ODYxNmE2YTM2NjI2ZjYyMzU2MjZhNzE3NDc3NjU3MTM2Nzc2MzY4NmI2NDZiNjk3MTM0NzY3NjY4Nzc3Mjc3NzI2ZTY1Mzc2OTdhMzQ2NjMyMzU3ODY5IC8vICJpcGZzOi8vYmFmeWJlaWNkZHo3a2J1eGFqajZib2I1YmpxdHdlcTZ3Y2hrZGtpcTR2dmh3cndybmU3aXo0ZjI1eGkiCmNhbGxzdWIgaW5uZXJjcmVhdGVuZnRfOQpzdG9yZSAxMQpsb2FkIDExCmludGNfMCAvLyAwCiE9CmFzc2VydApieXRlYyA2IC8vICJzdWJfdHlwZSIKYXBwX2dsb2JhbF9nZXQKZnJhbWVfYnVyeSAwCmZyYW1lX2RpZyAwCmxlbgppdG9iCmV4dHJhY3QgNiAwCmZyYW1lX2RpZyAwCmNvbmNhdApmcmFtZV9idXJ5IDAKbG9hZCAxMQpmcmFtZV9idXJ5IDEKZ2xvYmFsIExhdGVzdFRpbWVzdGFtcApmcmFtZV9idXJ5IDIKZnJhbWVfZGlnIDAKZnJhbWVfYnVyeSA3CmZyYW1lX2RpZyA3CmZyYW1lX2J1cnkgNgpwdXNoaW50IDE4IC8vIDE4CmZyYW1lX2J1cnkgNApmcmFtZV9kaWcgNAppdG9iCmV4dHJhY3QgNiAwCmZyYW1lX2RpZyAxCml0b2IKY29uY2F0CmZyYW1lX2RpZyAyCml0b2IKY29uY2F0CmZyYW1lX2RpZyA2CmNvbmNhdApmcmFtZV9idXJ5IDMKZnJhbWVfZGlnIC0xCnR4bmFzIEFjY291bnRzCmJveF9kZWwKcG9wCmZyYW1lX2RpZyAtMQp0eG5hcyBBY2NvdW50cwpmcmFtZV9kaWcgMwpib3hfcHV0CnJldHN1YgoKLy8gZ2V0X3N1YnNjcmlwdGlvbgpnZXRzdWJzY3JpcHRpb25fMTY6CnByb3RvIDEgMQpieXRlY18xIC8vICIiCmZyYW1lX2RpZyAtMQpib3hfZ2V0CnN0b3JlIDEzCnN0b3JlIDEyCmxvYWQgMTMKYXNzZXJ0CmxvYWQgMTIKZnJhbWVfYnVyeSAwCnJldHN1YgoKLy8gY2xhaW1fc3Vic2NyaXB0aW9uCmNsYWltc3Vic2NyaXB0aW9uXzE3Ogpwcm90byAwIDAKdHhuIFNlbmRlcgp0eG5hIEFzc2V0cyAwCmFzc2V0X2hvbGRpbmdfZ2V0IEFzc2V0QmFsYW5jZQpzdG9yZSAxNQpzdG9yZSAxNApsb2FkIDE1Ci8vIFN1YnNjcmliZXIgbm90IG9wdGVkLWluIGZvciBTdWJzY3JpcHRpb24gTkZUCmFzc2VydAp0eG5hIEFzc2V0cyAwCmdsb2JhbCBDdXJyZW50QXBwbGljYXRpb25BZGRyZXNzCnR4biBTZW5kZXIKY2FsbHN1YiBpbm5lcnRyYW5zZmVybmZ0XzEwCnJldHN1YgoKLy8gdHJhbnNmZXJfc3Vic2NyaXB0aW9uCnRyYW5zZmVyc3Vic2NyaXB0aW9uXzE4Ogpwcm90byAxIDAKYnl0ZWNfMSAvLyAiIgpkdXAKaW50Y18wIC8vIDAKZHVwbiAzCmJ5dGVjXzEgLy8gIiIKZHVwCnR4biBTZW5kZXIKYm94X2dldApzdG9yZSAxNwpzdG9yZSAxNgpsb2FkIDE3Ci8vIEN1cnJlbnQgYWRkcmVzcyBub3Qgc3Vic2NyaWJlZAphc3NlcnQKdHhuYSBBc3NldHMgMAp0eG4gU2VuZGVyCmdsb2JhbCBDdXJyZW50QXBwbGljYXRpb25BZGRyZXNzCmNhbGxzdWIgaW5uZXJ0cmFuc2Zlcm5mdF8xMAp0eG4gU2VuZGVyCmJveF9nZXQKc3RvcmUgMTkKc3RvcmUgMTgKbG9hZCAxOQphc3NlcnQKbG9hZCAxOApmcmFtZV9idXJ5IDAKZnJhbWVfZGlnIDAKZnJhbWVfZGlnIDAKaW50Y18wIC8vIDAKZXh0cmFjdF91aW50MTYKZGlnIDEKbGVuCnN1YnN0cmluZzMKZnJhbWVfYnVyeSAxCmZyYW1lX2RpZyAwCmludGNfMyAvLyAyCmV4dHJhY3RfdWludDY0CmZyYW1lX2J1cnkgMgpmcmFtZV9kaWcgMAppbnRjXzIgLy8gMTAKZXh0cmFjdF91aW50NjQKZnJhbWVfYnVyeSAzCmZyYW1lX2RpZyAxCmZyYW1lX2J1cnkgNwpmcmFtZV9kaWcgNwpmcmFtZV9idXJ5IDYKcHVzaGludCAxOCAvLyAxOApmcmFtZV9idXJ5IDQKZnJhbWVfZGlnIDQKaXRvYgpleHRyYWN0IDYgMApmcmFtZV9kaWcgMgppdG9iCmNvbmNhdApmcmFtZV9kaWcgMwppdG9iCmNvbmNhdApmcmFtZV9kaWcgNgpjb25jYXQKZnJhbWVfYnVyeSAwCmZyYW1lX2RpZyAtMQpib3hfZGVsCnBvcApmcmFtZV9kaWcgLTEKZnJhbWVfZGlnIDAKYm94X3B1dAp0eG4gU2VuZGVyCmJveF9kZWwKcG9wCnJldHN1YgoKLy8gdW5zdWJzY3JpYmUKdW5zdWJzY3JpYmVfMTk6CnByb3RvIDAgMApieXRlY18xIC8vICIiCnR4biBTZW5kZXIKZnJhbWVfYnVyeSAwCmZyYW1lX2RpZyAwCmxlbgpwdXNoaW50IDMyIC8vIDMyCj09CmFzc2VydApmcmFtZV9kaWcgMApjYWxsc3ViIGlubmVyZGVsZXRlc3Vic2NyaXB0aW9uXzEyCnJldHN1YgoKLy8gZGVsZXRlX3N1YnNjcmlwdGlvbgpkZWxldGVzdWJzY3JpcHRpb25fMjA6CnByb3RvIDEgMAp0eG4gU2VuZGVyCmNhbGxzdWIgYXV0aG9ubHlfNgovLyB1bmF1dGhvcml6ZWQKYXNzZXJ0CmZyYW1lX2RpZyAtMQpjYWxsc3ViIGlubmVyZGVsZXRlc3Vic2NyaXB0aW9uXzEyCnJldHN1Yg==";
  override clearProgram =
    "I3ByYWdtYSB2ZXJzaW9uIDgKcHVzaGludCAwIC8vIDAKcmV0dXJu";
  override methods: algosdk.ABIMethod[] = [
    new algosdk.ABIMethod({
      name: "update_config",
      desc: "",
      args: [
        { type: "pay", name: "config_pay_txn", desc: "" },
        { type: "string", name: "name", desc: "" },
        { type: "string", name: "sub_type", desc: "" },
        { type: "uint64", name: "price", desc: "" },
        { type: "uint64", name: "max_subs", desc: "" },
        { type: "uint64", name: "coin_id", desc: "" },
        { type: "uint64", name: "expires_at", desc: "" },
      ],
      returns: { type: "void", desc: "" },
    }),
    new algosdk.ABIMethod({
      name: "update_manager",
      desc: "",
      args: [{ type: "address", name: "new_manager_account", desc: "" }],
      returns: { type: "void", desc: "" },
    }),
    new algosdk.ABIMethod({
      name: "subscribe",
      desc: "",
      args: [
        { type: "pay", name: "box_fee_txn", desc: "" },
        { type: "txn", name: "subscribe_pay_txn", desc: "" },
        { type: "account", name: "subscriber_account", desc: "" },
      ],
      returns: { type: "void", desc: "" },
    }),
    new algosdk.ABIMethod({
      name: "get_subscription",
      desc: "",
      args: [{ type: "address", name: "subscriber", desc: "" }],
      returns: { type: "(string,uint64,uint64)", desc: "" },
    }),
    new algosdk.ABIMethod({
      name: "claim_subscription",
      desc: "",
      args: [],
      returns: { type: "void", desc: "" },
    }),
    new algosdk.ABIMethod({
      name: "transfer_subscription",
      desc: "",
      args: [{ type: "address", name: "new_address", desc: "" }],
      returns: { type: "void", desc: "" },
    }),
    new algosdk.ABIMethod({
      name: "unsubscribe",
      desc: "",
      args: [],
      returns: { type: "void", desc: "" },
    }),
    new algosdk.ABIMethod({
      name: "delete_subscription",
      desc: "",
      args: [{ type: "address", name: "subscriber", desc: "" }],
      returns: { type: "void", desc: "" },
    }),
  ];
  override getApplicationState(raw?: boolean | undefined): Promise<State> {
    return loadApplicationState(this.client, this.appId, raw);
  }
  async update_config(
    args: {
      config_pay_txn: algosdk.TransactionWithSigner | algosdk.Transaction;
      name: string;
      sub_type: string;
      price: bigint;
      max_subs: bigint;
      coin_id: bigint;
      expires_at: bigint;
    },
    txnParams?: bkr.TransactionOverrides
  ): Promise<bkr.ABIResult<void>> {
    const result = await this.execute(
      await this.compose.update_config(
        {
          config_pay_txn: args.config_pay_txn,
          name: args.name,
          sub_type: args.sub_type,
          price: args.price,
          max_subs: args.max_subs,
          coin_id: args.coin_id,
          expires_at: args.expires_at,
        },
        txnParams
      )
    );
    return new bkr.ABIResult<void>(result);
  }
  async update_manager(
    args: {
      new_manager_account: string;
    },
    txnParams?: bkr.TransactionOverrides
  ): Promise<bkr.ABIResult<void>> {
    const result = await this.execute(
      await this.compose.update_manager(
        { new_manager_account: args.new_manager_account },
        txnParams
      )
    );
    return new bkr.ABIResult<void>(result);
  }
  async subscribe(
    args: {
      box_fee_txn: algosdk.TransactionWithSigner | algosdk.Transaction;
      subscribe_pay_txn: algosdk.TransactionWithSigner | algosdk.Transaction;
      subscriber_account: string;
    },
    txnParams?: bkr.TransactionOverrides
  ): Promise<bkr.ABIResult<void>> {
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
    return new bkr.ABIResult<void>(result);
  }
  async get_subscription(
    args: {
      subscriber: string;
    },
    txnParams?: bkr.TransactionOverrides
  ): Promise<bkr.ABIResult<SubtopiaSubscription>> {
    const result = await this.execute(
      await this.compose.get_subscription(
        { subscriber: args.subscriber },
        txnParams
      )
    );
    return new bkr.ABIResult<SubtopiaSubscription>(
      result,
      SubtopiaSubscription.decodeResult(result.returnValue)
    );
  }
  async claim_subscription(
    txnParams?: bkr.TransactionOverrides
  ): Promise<bkr.ABIResult<void>> {
    const result = await this.execute(
      await this.compose.claim_subscription(txnParams)
    );
    return new bkr.ABIResult<void>(result);
  }
  async transfer_subscription(
    args: {
      new_address: string;
    },
    txnParams?: bkr.TransactionOverrides
  ): Promise<bkr.ABIResult<void>> {
    const result = await this.execute(
      await this.compose.transfer_subscription(
        { new_address: args.new_address },
        txnParams
      )
    );
    return new bkr.ABIResult<void>(result);
  }
  async unsubscribe(
    txnParams?: bkr.TransactionOverrides
  ): Promise<bkr.ABIResult<void>> {
    const result = await this.execute(
      await this.compose.unsubscribe(txnParams)
    );
    return new bkr.ABIResult<void>(result);
  }
  async delete_subscription(
    args: {
      subscriber: string;
    },
    txnParams?: bkr.TransactionOverrides
  ): Promise<bkr.ABIResult<void>> {
    const result = await this.execute(
      await this.compose.delete_subscription(
        { subscriber: args.subscriber },
        txnParams
      )
    );
    return new bkr.ABIResult<void>(result);
  }
  compose = {
    update_config: async (
      args: {
        config_pay_txn: algosdk.TransactionWithSigner | algosdk.Transaction;
        name: string;
        sub_type: string;
        price: bigint;
        max_subs: bigint;
        coin_id: bigint;
        expires_at: bigint;
      },
      txnParams?: bkr.TransactionOverrides,
      atc?: algosdk.AtomicTransactionComposer
    ): Promise<algosdk.AtomicTransactionComposer> => {
      return this.addMethodCall(
        algosdk.getMethodByName(this.methods, "update_config"),
        {
          config_pay_txn: args.config_pay_txn,
          name: args.name,
          sub_type: args.sub_type,
          price: args.price,
          max_subs: args.max_subs,
          coin_id: args.coin_id,
          expires_at: args.expires_at,
        },
        txnParams,
        atc
      );
    },
    update_manager: async (
      args: {
        new_manager_account: string;
      },
      txnParams?: bkr.TransactionOverrides,
      atc?: algosdk.AtomicTransactionComposer
    ): Promise<algosdk.AtomicTransactionComposer> => {
      return this.addMethodCall(
        algosdk.getMethodByName(this.methods, "update_manager"),
        { new_manager_account: args.new_manager_account },
        txnParams,
        atc
      );
    },
    subscribe: async (
      args: {
        box_fee_txn: algosdk.TransactionWithSigner | algosdk.Transaction;
        subscribe_pay_txn: algosdk.TransactionWithSigner | algosdk.Transaction;
        subscriber_account: string;
      },
      txnParams?: bkr.TransactionOverrides,
      atc?: algosdk.AtomicTransactionComposer
    ): Promise<algosdk.AtomicTransactionComposer> => {
      return this.addMethodCall(
        algosdk.getMethodByName(this.methods, "subscribe"),
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
        subscriber: string;
      },
      txnParams?: bkr.TransactionOverrides,
      atc?: algosdk.AtomicTransactionComposer
    ): Promise<algosdk.AtomicTransactionComposer> => {
      return this.addMethodCall(
        algosdk.getMethodByName(this.methods, "get_subscription"),
        { subscriber: args.subscriber },
        txnParams,
        atc
      );
    },
    claim_subscription: async (
      txnParams?: bkr.TransactionOverrides,
      atc?: algosdk.AtomicTransactionComposer
    ): Promise<algosdk.AtomicTransactionComposer> => {
      return this.addMethodCall(
        algosdk.getMethodByName(this.methods, "claim_subscription"),
        {},
        txnParams,
        atc
      );
    },
    transfer_subscription: async (
      args: {
        new_address: string;
      },
      txnParams?: bkr.TransactionOverrides,
      atc?: algosdk.AtomicTransactionComposer
    ): Promise<algosdk.AtomicTransactionComposer> => {
      return this.addMethodCall(
        algosdk.getMethodByName(this.methods, "transfer_subscription"),
        { new_address: args.new_address },
        txnParams,
        atc
      );
    },
    unsubscribe: async (
      txnParams?: bkr.TransactionOverrides,
      atc?: algosdk.AtomicTransactionComposer
    ): Promise<algosdk.AtomicTransactionComposer> => {
      return this.addMethodCall(
        algosdk.getMethodByName(this.methods, "unsubscribe"),
        {},
        txnParams,
        atc
      );
    },
    delete_subscription: async (
      args: {
        subscriber: string;
      },
      txnParams?: bkr.TransactionOverrides,
      atc?: algosdk.AtomicTransactionComposer
    ): Promise<algosdk.AtomicTransactionComposer> => {
      return this.addMethodCall(
        algosdk.getMethodByName(this.methods, "delete_subscription"),
        { subscriber: args.subscriber },
        txnParams,
        atc
      );
    },
  };
}
