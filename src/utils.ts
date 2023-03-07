import { encodeAddress } from "algosdk";
import AlgodClient from "algosdk/dist/types/client/v2/algod/algod";
import { StateValue, State } from "beaker-ts";

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
