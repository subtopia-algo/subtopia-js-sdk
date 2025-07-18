# Subtopia JavaScript SDK

[![npm version](https://badge.fury.io/js/subtopia-js-sdk.svg)](https://badge.fury.io/js/subtopia-js-sdk)
[![types included](https://badgen.net/npm/types/subtopia-js-sdk)](https://www.npmjs.com/package/subtopia-js-sdk)
[![codecov](https://codecov.io/gh/subtopia-algo/subtopia-js-sdk/branch/main/graph/badge.svg?token=YOUR_TOKEN)](https://codecov.io/gh/subtopia-algo/subtopia-js-sdk)

A TypeScript SDK for interacting with Subtopia on the Algorand blockchain. This SDK provides pure, stateless functions that wrap the typed clients for easy integration with any JavaScript framework.

## Features

- 🏗️ **Pure Functions**: Stateless functions that work with any state management solution
- 🌳 **Tree-Shakable**: Import only what you need for smaller bundle sizes
- 🔄 **Auto Resource Population**: Leverages AlgoKit Utils for automatic resource management
- 💰 **Automatic Fee Calculation**: Built-in support for inner transaction fees
- 🔥 **Type Safety**: Full TypeScript support with generated typed clients
- 🚀 **Optimized for Public Gateways**: Batch operations to minimize HTTP calls

## Installation

```bash
# npm
npm install subtopia-js-sdk @algorandfoundation/algokit-utils algosdk

# yarn
yarn add subtopia-js-sdk @algorandfoundation/algokit-utils algosdk

# pnpm
pnpm add subtopia-js-sdk @algorandfoundation/algokit-utils algosdk
```

### Peer Dependencies

- `@algorandfoundation/algokit-utils`: ^9.1.0
- `algosdk`: ^3.2.0

## Quick Start

```typescript
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import * as Subtopia from "subtopia-js-sdk/core";

// Initialize
const algorand = AlgorandClient.fromEnvironment();
const config = {
  algorand,
  chainType: Subtopia.ChainType.TESTNET,
};

// Create a product
const product = await Subtopia.createProduct(config, {
  creator: "CREATOR_ADDRESS",
  name: "Premium Subscription",
  subscriptionName: "Pro Plan",
  price: 1000000n, // 1 ALGO
  duration: 2592000n, // 30 days
});

// Subscribe to a product
const subscription = await Subtopia.subscribe(config, {
  productId: product.productId,
  subscriber: "SUBSCRIBER_ADDRESS",
});

// Check subscription status
const isActive = await Subtopia.isActiveSubscriber(
  config,
  product.productId,
  "SUBSCRIBER_ADDRESS",
);
```

## Core API Reference

### Configuration

```typescript
interface SubtopiaConfig {
  algorand: AlgorandClient;
  registryId?: bigint;
  chainType?: ChainType;
  timeout?: number;
}
```

### Product Management

- `createProduct(config, params)` - Create a new subscription product
- `getProductState(config, productId)` - Get product details
- `enableProduct(config, params)` - Enable a product (manager only)
- `disableProduct(config, params)` - Disable a product (manager only)
- `transferProduct(config, params)` - Transfer ownership
- `deleteProduct(config, params)` - Delete a product

### Subscription Management

- `subscribe(config, params)` - Subscribe to a product
- `getSubscription(config, productId, subscriber)` - Get subscription details
- `isActiveSubscriber(config, productId, subscriber)` - Check subscription status
- `claimSubscription(config, params)` - Claim a subscription NFT
- `transferSubscription(config, params)` - Transfer a subscription
- `deleteSubscription(config, params)` - Cancel a subscription

### Batch Operations (Optimized for Public Gateways)

- `getSubscriptionBatch(config, productIds, subscriber)` - Get subscriptions for multiple products
- `isActiveSubscriberBatch(config, productIds, subscriber)` - Check active status for multiple products
- `getProductSubscriptions(config, productId, activeOnly?)` - Get all subscriptions for a product

### Locker Management

- `getLocker(config, creator, type?)` - Get locker for a creator
- `createLocker(config, creator, type?)` - Create a new locker
- `getOrCreateLocker(config, creator)` - Get existing or create new locker

## Usage with State Management

The SDK is designed to work with any state management solution. Here are examples with popular libraries:

### With SWR

```typescript
import useSWR from "swr";
import * as Subtopia from "subtopia-js-sdk/core";

function useProduct(productId: bigint) {
  const { data, error, mutate } = useSWR(["product", productId], () =>
    Subtopia.getProductState(config, productId),
  );

  return {
    product: data,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate,
  };
}
```

### With React Query

```typescript
import { useQuery } from "@tanstack/react-query";
import * as Subtopia from "subtopia-js-sdk/core";

function useProduct(productId: bigint) {
  return useQuery({
    queryKey: ["product", productId],
    queryFn: () => Subtopia.getProductState(config, productId),
  });
}
```

### With Redux Toolkit

```typescript
import { createAsyncThunk } from "@reduxjs/toolkit";
import * as Subtopia from "subtopia-js-sdk/core";

export const fetchProduct = createAsyncThunk(
  "products/fetch",
  async (productId: bigint) => {
    return await Subtopia.getProductState(config, productId);
  },
);
```

## Direct Client Access

For advanced use cases, you can access the typed clients directly:

```typescript
import { TokenBasedProductClient } from "subtopia-js-sdk";

const client = new TokenBasedProductClient({
  algorand,
  appId: 123456n,
});

// Direct ABI method calls
const state = await client.state.global.getAll();
const version = await client.getVersion();
```

## Best Practices

1. **Use Batch Operations**: When fetching data for multiple products, use batch operations to minimize HTTP calls.

2. **Error Handling**: All async operations can throw errors. Use try-catch blocks appropriately.

3. **Type Safety**: Leverage TypeScript's type system for better development experience.

4. **Tree Shaking**: Import only the functions you need to keep bundle sizes small.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

See [LICENSE](LICENSE.md) file for details.

## Support

- Documentation: [https://docs.subtopia.io](https://docs.subtopia.io)
- Discord: [Join our community](https://discord.gg/subtopia)
- GitHub Issues: [Report bugs or request features](https://github.com/subtopia-algo/subtopia-js-sdk/issues)

---

Built with ❤️ by the Subtopia team
