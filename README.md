# Shred API

A TypeScript-based client library for interacting with Shreds on the RISE Chain, leveraging RISE Chain's synchronous transaction capabilities to unlock the full potential of Shreds on the RISE Chain Testnet. This library is built on top of [Viem](https://viem.sh/).

## Introduction

This package provides a client library for RISE Chain, specifically designed for using the custom `eth_sendRawTransactionSync` RPC method which allows sending a transaction and waiting for its receipt in a single call, significantly simplifying transaction handling for Shreds interactions.

## Custom RPC Methods

RISE Chain introduces new RPC methods that extend standard Ethereum functionality:

### eth_sendRawTransactionSync

- **eth_sendRawTransactionSync**: Submits a pre-signed transaction and waits for the receipt in a single call
  - Unlike standard `eth_sendRawTransaction` which returns immediately with a transaction hash
  - Eliminates the need for polling with `eth_getTransactionReceipt`
  - Provides the full transaction receipt in one call

With this method, you can send a transaction and receive extremely fast responses, as low as 5ms if the client is close to the sequencer.

### rise_subscribe

- **rise_subscribe**: Enables real-time subscriptions to shreds and events on the RISE network
  - Subscribe to new shreds as they are processed and confirmed
  - Watch for specific contract events that have been processed as shreds
  - Receive real-time updates without polling
  - Provides abstractions through various `watchShred*` actions for different use cases

## Features

- **Shreds Client:** Interact with Shreds on the RISE Network with synchronous transaction capabilities.
- **Synchronous Transactions:** Leverages RISE Chain's custom `eth_sendRawTransactionSync` RPC method for fast, single-call transaction handling.
- **Real-time Subscriptions:** Provides abstractions for the `rise_subscribe` RPC method through various `watchShred*` actions:
  - `watchShreds`: Subscribe to new shreds as they are processed and confirmed
  - `watchShredEvent`: Watch for specific events that have been processed as shreds
  - `watchContractShredEvent`: Monitor contract events processed as shreds with ABI decoding
- **Viem Integration:** Built on top of Viem for robust and type-safe interactions with the blockchain.
- **WebSocket Transport:** Includes a custom WebSocket transport for real-time Shreds monitoring.
- **Fast Response Times:** Achieve transaction confirmations as low as 5ms when close to the sequencer.

## Installation

To install the `shred-api` package, use your preferred package manager:

```bash
bun add shred-api
# or
npm install shred-api
# or
yarn add shred-api
# or
pnpm add shred-api
```

## Usage

### Creating a Public Shred Client

```typescript
import { createPublicShredClient, shredsWebSocket } from 'shred-api/viem'
import { riseTestnet } from 'viem/chains'

const client = createPublicShredClient({
  chain: riseTestnet,
  transport: shredsWebSocket(), // Replace with your Shreds WebSocket endpoint
})

// Now you can use the client to interact with Shreds
// For example, watching for new shreds:
client.watchShreds({
  onShred: (shred) => {
    console.log('New shred:', shred)
  },
})
```

### Decorating a Viem Client

You can also decorate an existing Viem client with Shreds functionality:

```typescript
import { shredActions, shredsWebSocket } from 'shred-api/viem'
import { createPublicClient } from 'viem'
import { riseTestnet } from 'viem/chains'

const publicClient = createPublicClient({
  chain: riseTestnet,
  transport: shredsWebSocket(), // Your Shreds WebSocket endpoint
}).extend(shredActions)

// Now the publicClient has Shreds-specific actions
publicClient.watchShreds({
  onShred: (shred) => {
    console.log('New shred from decorated client:', shred)
  },
})
```

## Development

To set up the development environment:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/risechain/shred-api.git
    cd shred-api
    ```
2.  **Install dependencies:**
    ```bash
    bun install
    ```
3.  **Run tests:**
    ```bash
    bun test
    ```
4.  **Build the library:**
    ```bash
    bun run build
    ```
5.  **Run in development mode (with watch):**
    ```bash
    bun run dev
    ```
6.  **Lint and format:**
    ```bash
    bun run lint
    bun run format
    ```

## Contributing

Contributions are welcome! Please refer to the [issues page](https://github.com/risechain/shred-api/issues) for known bugs or feature requests.

## License

[MIT License](./LICENSE) © 2025 [risechain team](https://github.com/risechain)
