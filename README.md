<p align="center"><img  width=100%  src="https://bafybeietopj64xoicecmuruwcn7n2vijfgffrcv3ur4vw3qh477ezllchm.ipfs.nftstorage.link/" /></p>

<p align="center">
    <a href="https://www.npmjs.com/package/subtopia-js"><img src="https://badge.fury.io/js/subtopia-js.svg" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/subtopia-js" >
    <img src="https://img.shields.io/npm/types/subtopia-js"/>
    </a>
    <a href="https://codecov.io/gh/subtopia-algo/subtopia-js" >
    <img src="https://codecov.io/gh/subtopia-algo/subtopia-js/branch/main/graph/badge.svg?token=FEJBE5IAW5"/>
    </a>
    <a href="https://subtopia.io"><img src="https://img.shields.io/badge/platform-link-cyan.svg" /></a>
    <a href="https://algorand.com"><img src="https://img.shields.io/badge/Powered by-Algorand-black.svg" /></a>
</p>

---

## 🌟 About

Subtopia JS SDK is a JavaScript library for interacting with the Subtopia Platform. It provides a simple interface for creating and managing Subscription Management Infrastructures (`SMI`s).

> For detailed documentation, refer to [sdk.subtopia.io](https://sdk.subtopia.io).

### ⚡ Examples

- [subtopia-js-examples](https://github.com/subtopia-algo/subtopia-js-examples) - A separate repository with examples of using the Subtopia JS SDK in React, Svelte, Vue and NextJS.

## 📦 Installation

### Install the package:

```bash
# with npm
npm install subtopia-js

# or with yarn
yarn add subtopia-js
```

### Import the package:

```ts
import { SubtopiaClient } from "subtopia-js";
```

## 🛠️ Usage

### Purchasing a subscription:

```ts
// ... your code

const response = await SubtopiaClient.subscribe(
  {
    subscriber: { address: {PUT_WALLET_ADDRESS}, signer: {PUT_WALLET_SIGNER} },
    smiID: { PUT_SMI_ID_HERE }, // number - the ID of the SMI instance you want to subscribe to
  },
  { client: {PUT_ALGOD_INSTANCE_HERE} // object of type algosdk.Algodv2
);

console.log(response.returnValue) // response is of type ABIResult

// ... rest of your code
```

### Subscription lookup:

```ts
// ... your code
const subscriberBox = await SubtopiaClient.getSubscriptionRecordForAccount(
  client,
  { PUT_SUBSCRIBER_ADDRESS },
  { PUT_SMI_ID_HERE }
);

// SubscriptionRecord (throws Error if not subscribed)
console.log(subscriberBox);
// ... rest of your code
```

### Unsubscribing:

```ts
// ... your code
const deleteResult = await SubtopiaClient.unsubscribe(
  {
    subscriber: {
      address: { PUT_SUBSCRIBER_ADDRESS },
      signer: { PUT_SUBSCRIBER_SIGNER },
    },
    smiID: { PUT_INFRASTRUCTURE_ID },
  },
  {
    client: { PUT_ALGOD_CLIENT },
  }
);

// ID of the deleted subscription ASA
console.log(deleteResult.returnValue);
// ... your code
```

### Transfering subscription:

```ts
// ... your code
const transferResult = await SubtopiaClient.transferSubscriptionPass(
  {
    newOwnerAddress: { PUT_NEW_OWNER_ADDRESS },
    oldOwner: {
      address: { PUT_OLD_OWNER_ADDRESS },
      signer: { PUT_OLD_OWNER_SIGNER },
    },
    smiID: { PUT_INFRASTRUCTURE_ID },
    subID: Number(result.returnValue),
  },
  { client: { PUT_ALGOD_CLIENT } }
);

// Transaction ID of the transfer transaction
console.log(deleteResult.txID);
// ... your code
```

## ⭐️ Stargazers

Special thanks to everyone who starred the repository ❤️

[![Stargazers repo roster for @subtopia-algo/subtopia-js](https://reporoster.com/stars/dark/subtopia-algo/subtopia-js)](https://github.com/subtopia-algo/subtopia-js/stargazers)
