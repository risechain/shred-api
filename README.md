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

## Installation

```bash
# Install from npm
npm install rise-shred-client

# Or with yarn
yarn add rise-shred-client

# Or with pnpm
pnpm add rise-shred-client
```

## Development Setup

```bash
# Clone the repository
git clone https://github.com/SmoothBot/rise-shred-client.git
cd rise-shred-client

# Install dependencies
npm install

# Build the package
npm run build

# Run examples
npm run dev
```

## Testing Locally

You can test this package locally using one of the following methods:

### Method 1: Using local installation

This creates a test project and installs your package locally:

```bash
# Build and set up a test project
npm run test:link

# This creates a test project at ./test-link
# Go to the test directory
cd test-link

# Add your private key to .env file

# Run test with ethers.js implementation
npm run test-ethers

# Run test with viem implementation
npm run test-viem
```

### Method 2: Using npm pack (Tarball)

This creates a tarball of your package that you can install in other projects:

```bash
# Build, pack, and create a test project
npm run test:pack

# This creates a test project at ./test-pack
# Go to the test directory
cd test-pack

# Add your private key to .env file

# Run test with ethers.js implementation
npm run test-ethers

# Run test with viem implementation
npm run test-viem
```

## Usage Examples

### Using with ethers.js

```typescript
import { SyncTransactionProvider } from "rise-shred-client";
import { Wallet } from "ethers";
import 'dotenv/config';

// Get RPC URL from environment variables
const rpcUrl = process.env.RPC_URL || 'https://indexing.staging.riselabs.xyz/';

// Create provider with RISE Chain testnet URL
const provider = new SyncTransactionProvider(rpcUrl);

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
import { createSyncPublicClient, syncTransport } from "rise-shred-client";
import { privateKeyToAccount } from "viem/accounts";
import 'dotenv/config';

// Get RPC URL from environment variables
const rpcUrl = process.env.RPC_URL || 'https://indexing.staging.riselabs.xyz/';

// Create client with RISE Chain testnet URL
const client = createSyncPublicClient({
  transport: syncTransport(rpcUrl)
});

// Get chain ID
const chainId = await client.getChainId();
console.log("Connected to chainId:", chainId);

// Send and get receipt in one call
const receipt = await client.sendRawTransactionSync(signedTransaction);
console.log("Transaction confirmed in block:", receipt.blockNumber);
```

## RISE Chain Testnet Configuration

To use this package with the RISE Chain testnet, set the following environment variables:

```
RPC_URL=https://indexing.staging.riselabs.xyz/
PRIVATE_KEY=your_private_key_here
```

You can create a `.env` file in your project root with these values.

- **Default Chain ID**: `11155008`
- **Network Name**: RISE Testnet
- **Currency**: ETH (test)