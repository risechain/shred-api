# Shred API

A TypeScript-based API for interacting with RISE Chain's synchronous transaction capabilities to unlock the full potential of Shreds on the RISE Chain Testnet.

## Introduction

This package provides a client library for RISE Chain, specifically for using the custom `eth_sendRawTransactionSync` RPC method which allows sending a transaction and waiting for its receipt in a single call, significantly simplifying transaction handling.

## Custom RPC Method

RISE Chain introduces a new RPC method `eth_sendRawTransactionSync` that extends standard Ethereum functionality:

- **eth_sendRawTransactionSync**: Submits a pre-signed transaction and waits for the receipt in a single call
  - Unlike standard `eth_sendRawTransaction` which returns immediately with a transaction hash
  - Eliminates the need for polling with `eth_getTransactionReceipt`
  - Provides the full transaction receipt in one call

With this method, you can send a transaction and receive extremely fast, as low as 5ms if the client is close to the sequencer.

## Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production server
npm start
```

## Usage Examples

### Using with ethers.js

```typescript
import { SyncTransactionProvider } from "shred-api";
import { Wallet } from "ethers";

// Create provider with RISE Chain testnet URL
const provider = new SyncTransactionProvider(process.env.RPC_URL);

// Get network to retrieve chain ID
const network = await provider.getNetwork();
console.log("Connected to network:", network.name, "with chainId:", network.chainId);

// Create wallet
const wallet = new Wallet(privateKey, provider);

// Send transaction with sync receipt
const receipt = await provider.sendRawTransactionSync(signedTransaction);
console.log("Transaction confirmed in block:", receipt.blockNumber.toString());
```

### Using with viem

```typescript
import { createSyncPublicClient, syncTransport } from "shred-api";
import { privateKeyToAccount } from "viem/accounts";

// Create client with RISE Chain testnet URL
const client = createSyncPublicClient({
  transport: syncTransport(process.env.RPC_URL)
});

// Get chain ID
const chainId = await client.getChainId();
console.log("Connected to chainId:", chainId);

// Send and get receipt in one call
const receipt = await client.sendRawTransactionSync(signedTransaction);
console.log("Transaction confirmed in block:", receipt.blockNumber);
```