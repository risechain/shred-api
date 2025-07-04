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

## Features

- **Shreds Client:** Interact with Shreds on the RISE Network with synchronous transaction capabilities.
- **Synchronous Transactions:** Leverages RISE Chain's custom `eth_sendRawTransactionSync` RPC method for fast, single-call transaction handling.
- **Real-time Subscriptions:** Provides abstractions for subscribing to shreds through various `watchShred*` actions:
  - `watchShreds`: Subscribe to new shreds as they are processed and confirmed
  - `watchShredEvent`: Watch for specific events that have been processed as shreds
  - `watchContractShredEvent`: Monitor contract events processed as shreds with ABI decoding
- **Viem Integration:** Built on top of Viem for robust and type-safe interactions with the blockchain.
- **WebSocket Transport:** Includes a custom WebSocket transport for real-time Shreds monitoring.
- **Fast Response Times:** Achieve transaction confirmations as low as 5ms when close to the sequencer.

## Installation

To install the `shreds` package, use your preferred package manager:

```bash
bun add shreds
# or
npm install shreds
# or
yarn add shreds
# or
pnpm add shreds
```

## Usage

### Creating a Public Shred Client

```typescript
import { createPublicShredClient, shredsWebSocket } from 'shreds/viem'
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
import { shredActions, shredsWebSocket } from 'shreds/viem'
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

### Watching for Shred Events

#### watchShredEvent

Watch for specific events that have been processed and confirmed as shreds on the RISE network.

```typescript
import { createPublicShredClient, shredsWebSocket } from 'shreds/viem'
import { riseTestnet } from 'viem/chains'

const client = createPublicShredClient({
  chain: riseTestnet,
  transport: shredsWebSocket(),
})

// Define the event ABI you want to watch
const transferEvent = {
  type: 'event',
  name: 'Transfer',
  inputs: [
    { name: 'from', type: 'address', indexed: true },
    { name: 'to', type: 'address', indexed: true },
    { name: 'value', type: 'uint256', indexed: false },
  ],
} as const

// Watch for Transfer events
const unsubscribe = client.watchShredEvent({
  event: transferEvent,
  address: '0x742d35Cc6634C0532925a3b8D0C9e3e0C8b0e8c8', // Optional: filter by contract
  onLogs: (logs) => {
    logs.forEach((log) => {
      console.log('Transfer:', log.args.from, '→', log.args.to, log.args.value)
    })
  },
})
```

#### watchContractShredEvent

Watch for contract events using the full contract ABI with automatic event decoding.

```typescript
// ERC-20 contract ABI (partial)
const erc20Abi = [
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Approval',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'spender', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const

// Watch for all events from the contract
const unsubscribe = client.watchContractShredEvent({
  abi: erc20Abi,
  address: '0x742d35Cc6634C0532925a3b8D0C9e3e0C8b0e8c8',
  onLogs: (logs) => {
    logs.forEach((log) => {
      console.log(`${log.eventName}:`, log.args)
    })
  },
})

// Watch for specific event only
const unsubscribeTransfers = client.watchContractShredEvent({
  abi: erc20Abi,
  eventName: 'Transfer',
  address: '0x742d35Cc6634C0532925a3b8D0C9e3e0C8b0e8c8',
  onLogs: (logs) => {
    logs.forEach((log) => {
      console.log('Transfer:', log.args.from, '→', log.args.to, log.args.value)
    })
  },
})
```

### Using sendRawTransactionSync

The `sendRawTransactionSync` method is the core feature that enables synchronous transaction processing on RISE Chain. Here are several ways to use it:

#### Basic Usage with createPublicSyncClient

```typescript
import { createPublicSyncClient } from 'shreds/viem'
import { http } from 'viem'
import { riseTestnet } from 'viem/chains'

const syncClient = createPublicSyncClient({
  chain: riseTestnet,
  transport: http(),
})

// Send a pre-signed transaction and get the receipt immediately
const serializedTransaction =
  '0x02f86c0180843b9aca00825208940000000000000000000000000000000000000000880de0b6b3a764000080c0'

try {
  const receipt = await syncClient.sendRawTransactionSync({
    serializedTransaction,
  })

  console.log('Transaction confirmed:', receipt.transactionHash)
  console.log('Block number:', receipt.blockNumber)
  console.log('Gas used:', receipt.gasUsed)
  console.log('Status:', receipt.status) // 'success' or 'reverted'
} catch (error) {
  console.error('Transaction failed:', error)
}
```

#### Using with Wallet Client for Complete Transaction Flow

```typescript
import { createPublicSyncClient } from 'shreds/viem'
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { riseTestnet } from 'viem/chains'

// Create a sync client for sending transactions
const syncClient = createPublicSyncClient({
  chain: riseTestnet,
  transport: http(),
})

// Create a wallet client for signing transactions
const account = privateKeyToAccount('0x...')
const walletClient = createWalletClient({
  account,
  chain: riseTestnet,
  transport: http(),
})

// Prepare and send a transaction
async function sendTransaction() {
  try {
    // Prepare the transaction
    const request = await walletClient.prepareTransactionRequest({
      to: '0x742d35Cc6634C0532925a3b8D0C9e3e0C8b0e8c8',
      value: 1000000000000000000n, // 1 ETH in wei
    })

    // Sign the transaction
    const serializedTransaction = await walletClient.signTransaction(request)

    // Send and get receipt in one call
    const receipt = await syncClient.sendRawTransactionSync({
      serializedTransaction,
    })

    console.log('✅ Transaction successful!')
    console.log('Hash:', receipt.transactionHash)
    console.log('Block:', receipt.blockNumber)

    return receipt
  } catch (error) {
    console.error('❌ Transaction failed:', error)
    throw error
  }
}

sendTransaction()
```

#### Decorating Existing Client with Sync Actions

```typescript
import { syncActions } from 'shreds/viem'
import { createPublicClient, http } from 'viem'
import { riseTestnet } from 'viem/chains'

const client = createPublicClient({
  chain: riseTestnet,
  transport: http(),
}).extend(syncActions)

// Now you can use sendRawTransactionSync on the extended client
const receipt = await client.sendRawTransactionSync({
  serializedTransaction: '0x...',
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
