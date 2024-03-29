<p align="center"><img  width=100%  src="https://bafybeietopj64xoicecmuruwcn7n2vijfgffrcv3ur4vw3qh477ezllchm.ipfs.nftstorage.link/" /></p>

<p align="center">
    <a href="https://www.npmjs.com/package/subtopia-js-sdk"><img src="https://badge.fury.io/js/subtopia-js-sdk.svg" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/subtopia-js-sdk" >
    <img src="https://img.shields.io/npm/types/subtopia-js-sdk"/>
    </a>
    <a href="https://codecov.io/gh/subtopia-algo/subtopia-js-sdk" >
    <img src="https://codecov.io/gh/subtopia-algo/subtopia-js-sdk/branch/main/graph/badge.svg?token=FEJBE5IAW5"/>
    </a>
    <a href="https://subtopia.io"><img src="https://img.shields.io/badge/platform-link-cyan.svg" /></a>
    <a href="https://algorand.com"><img src="https://img.shields.io/badge/Powered by-Algorand-black.svg" /></a>
</p>

---

## 🌟 About

Subtopia JS SDK is a JavaScript library for interacting with the Subtopia Platform. It provides a simple interface for creating and managing `Products` (Contracts that are responsible for subscription management).

> For detailed documentation, refer to [sdk.subtopia.io](https://sdk.subtopia.io).

### ⚡ Examples

- [subtopia-js-examples](https://github.com/subtopia-algo/subtopia-js-examples) - A separate repository with examples of using the Subtopia JS SDK in React, Svelte, Vue and NextJS.

## 📦 Installation

### Install the package:

```bash
# with npm
npm install subtopia-js-sdk

# or with yarn
yarn add subtopia-js-sdk
```

### Import the package:

```ts
import { SubtopiaClient, SubtopiaRegistryClient } from "subtopia-js-sdk";
```

## 🛠️ Usage

Example snippets of using the Subtopia JS SDK.

### **Subscriptions**

### Purchasing a subscription:

```ts
import {
  SubtopiaClient,
  SubtopiaRegistryClient,
  ChainType,
  SUBTOPIA_REGISTRY_ID
} from "subtopia-js-sdk";
// ...  your code

const subtopiaClient = await SubtopiaClient.init({
  algodClient: PUT_ALGOD_INSTANCE_HERE,
  chainType: PUT_CHAIN_TYPE_ENUM_HERE // 'testnet'|'mainnet'|'localnet'
  productID: PUT_PRODUCT_ID_HERE,
  registryID: SUBTOPIA_REGISTRY_ID(ChainType.{YOUR_CHAIN_TYPE_HERE}),
  creator: { addr: PUT_WALLET_ADDRESS, signer: PUT_WALLET_SIGNER },
});

const response = await subtopiaClient.createSubscription(
  { subscriber: { addr: PUT_WALLET_ADDRESS, signer: PUT_WALLET_SIGNER } },
);

console.log(response.txID); // response is of type string

// ... rest of your code
```

### Subscription lookup:

```ts
// ... your code
const subscriptionRecord = await subtopiaClient.getSubscription({
  subscriberAddress: PUT_SUBSCRIBER_ADDRESS,
  algodClient: PUT_ALGOD_INSTANCE_HERE,
});

// SubscriptionRecord (throws Error if not subscribed)
console.log(subscriptionRecord);
// ... rest of your code
```

### Unsubscribing:

```ts
// ... your code
const deleteResult = await subtopiaClient.deleteSubscription({
  subscriber: {
    addr: PUT_SUBSCRIBER_ADDRESS,
    signer: PUT_SUBSCRIBER_SIGNER,
  },
  subscriptionID: PUT_SUBSCRIPTION_ID,
});

// Transaction ID of the unsubscribe transaction
console.log(deleteResult.txID);
// ... your code
```

### Transfering subscription:

```ts
// ... your code
const transferResult = await subtopiaClient.transferSubscription({
  oldSubscriber: {
    addr: PUT_OLD_SUBSCRIBER_ADDRESS,
    signer: PUT_OLD_SUBSCRIBER_SIGNER,
  },
  newSubscriberAddress: PUT_NEW_SUBSCRIBER_ADDRESS,
  subscriptionID: PUT_SUBSCRIPTION_ID,
});

// Transaction ID of the transfer transaction
console.log(transferResult.txID);
// ... your code
```

### **Discounts**

### Creating a discount:

```ts
// ... your code

const subtopiaRegistryClient = await SubtopiaRegistryClient.init({
  algodClient: PUT_ALGOD_INSTANCE_HERE,
  creator: { addr: PUT_WALLET_ADDRESS, signer: PUT_WALLET_SIGNER },
  chainType: PUT_CHAIN_TYPE_HERE,
});

const discount = await subtopiaRegistryClient.createDiscount({
  discountType: PUT_DISCOUNT_TYPE_HERE, // number - the type of discount to apply. FIXED or PERCENTAGE
  discountValue: PUT_DISCOUNT_VALUE_HERE, // number - the discount to be deducted from the subscription price
  expiresIn: PUT_EXPIRATION_TIME_HERE, // (Optional) Set 0 for discount to never expire. Else set number of seconds to append to unix timestamp at time of creation.
});

console.log(discount.txID); // response is of type string

// ... rest of your code
```

### Discount lookup:

```ts
// ... your code

const discount = await subtopiaClient.getDiscount();

// DiscountRecord (throws Error if no active discount)
console.log(discount);
// ... rest of your code
```

### Deleting a discount:

```ts
// ... your code

const deleteResult = await subtopiaRegistryClient.deleteDiscount();

// Transaction ID of the delete discount transaction
console.log(deleteResult.txID);
// ... your code
```

## ⭐️ Stargazers

Special thanks to everyone who starred the repository ❤️

[![Stargazers repo roster for @subtopia-algo/subtopia-js-sdk](https://reporoster.com/stars/dark/subtopia-algo/subtopia-js-sdk)](https://github.com/subtopia-algo/subtopia-js-sdk/stargazers)
