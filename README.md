# Shred API

A client library for interacting with Shreds on the Rise Network. This library is built on top of [Viem](https://viem.sh/).

## Features

- **Shreds Client:** Interact with Shreds on the Rise Network.
- **Viem Integration:** Leverages Viem for robust and type-safe interactions with the blockchain.
- **WebSocket Transport:** Includes a custom WebSocket transport for Shreds.

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
