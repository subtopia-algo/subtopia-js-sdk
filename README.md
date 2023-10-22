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

Subtopia JS SDK is a JavaScript library for interacting with the Subtopia Platform. It provides a simple interface for creating and managing `Products` (Contracts that are responsible for subscription management).

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
import { SubtopiaClient, SubtopiaRegistryClient } from "subtopia-js";
```

## 🛠️ Usage

Example snippets of using the Subtopia JS SDK.

### **Subscriptions**

### Purchasing a subscription:

```ts
// ... your code

const subtopiaClient = await SubtopiaClient.init(
  { PUT_ALGOD_INSTANCE_HERE },
  { PUT_PRODUCT_ID_HERE },
  { address: { PUT_WALLET_ADDRESS }, signer: { PUT_WALLET_SIGNER } }
);

const response = await subtopiaClient.subscribe(
  { address: { PUT_WALLET_ADDRESS }, signer: { PUT_WALLET_SIGNER } },
  { PUT_DURATION_HERE } // pick duration from Duration enum. If there is a discount available for this duration, it will be auto applied.
);

console.log(response.txID); // response is of type string

// ... rest of your code
```

### Subscription lookup:

```ts
// ... your code
const subscriptionRecord = await subtopiaClient.getSubscription({
  subscriberAddress: { PUT_SUBSCRIBER_ADDRESS },
});

// SubscriptionRecord (throws Error if not subscribed)
console.log(subscriptionRecord);
// ... rest of your code
```

### Unsubscribing:

```ts
// ... your code
const deleteResult = await subtopiaClient.unsubscribe({
  subscriber: {
    address: { PUT_SUBSCRIBER_ADDRESS },
    signer: { PUT_SUBSCRIBER_SIGNER },
  },
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
    address: { PUT_OLD_SUBSCRIBER_ADDRESS },
    signer: { PUT_OLD_SUBSCRIBER_SIGNER },
  },
  newSubscriberAddress: { PUT_NEW_SUBSCRIBER_ADDRESS },
});

// Transaction ID of the transfer transaction
console.log(transferResult.txID);
// ... your code
```

### **Discounts**

### Creating a discount:

```ts
// ... your code

const subtopiaRegistryClient = await SubtopiaRegistryClient.init(
  { PUT_ALGOD_INSTANCE_HERE },
  { address: { PUT_WALLET_ADDRESS }, signer: { PUT_WALLET_SIGNER } },
  { PUT_CHAIN_TYPE_HERE }
);

const discount = await subtopiaRegistryClient.createDiscount({
  productID: { PUT_PRODUCT_ID_HERE }, // number - the ID of the Product instance you want to create a discount for
  discount: {
    duration: { PUT_DURATION_HERE }, // number - the type of duration to apply. Also serves as static id for the discount.
    discountType: { PUT_DISCOUNT_TYPE_HERE }, // number - the type of discount to apply. FIXED or PERCENTAGE
    discountValue: { PUT_DISCOUNT_VALUE_HERE }, // number - the discount to be deducted from the subscription price
    expiresIn: { PUT_EXPIRATION_TIME_HERE }, // (Optional) Set 0 for discount to never expire. Else set number of seconds to append to unix timestamp at time of creation.
  }, // number - the discount in percent
});

console.log(discount.txID); // response is of type string

// ... rest of your code
```

### Discount lookup:

```ts
// ... your code

const discount = await subtopiaRegistryClient.getDiscount(
  productID: { PUT_PRODUCT_ID_HERE },
  duration: { PUT_DURATION_HERE },
);

// DiscountRecord (throws Error if not found)
console.log(discount);
// ... rest of your code
```

### Deleting a discount:

```ts
// ... your code

const deleteResult = await subtopiaRegistryClient.deleteDiscount({
  productID: { PUT_PRODUCT_ID },
  duration: { PUT_DURATION_HERE },
});

// Transaction ID of the delete discount transaction
console.log(deleteResult.txID);
// ... your code
```

## ⭐️ Stargazers

Special thanks to everyone who starred the repository ❤️

[![Stargazers repo roster for @subtopia-algo/subtopia-js](https://reporoster.com/stars/dark/subtopia-algo/subtopia-js)](https://github.com/subtopia-algo/subtopia-js/stargazers)
