#!/bin/bash
# Script to pack the package and install it in a test project

# Define variables
PACKAGE_DIR="$(pwd)"
TEST_DIR="$PACKAGE_DIR/test-pack"

# Create test directory
mkdir -p "$TEST_DIR"

# Build and pack the package
cd "$PACKAGE_DIR"
echo "Building the package..."
npm run build

echo "Creating package tarball..."
npm pack

# Get the tarball filename
TARBALL=$(ls rise-shred-client-*.tgz | tail -n 1)

# Move to test directory and set up a test project
cd "$TEST_DIR"

# Initialize a new Node.js project
echo "Initializing a new Node.js project in $TEST_DIR..."
npm init -y

# Install TypeScript and ts-node for running TypeScript files
echo "Installing TypeScript dependencies..."
npm install typescript ts-node dotenv --save-dev

# Install peer dependencies
echo "Installing peer dependencies..."
npm install ethers viem

# Install the packed package
echo "Installing the packed package..."
npm install "$PACKAGE_DIR/$TARBALL"

# Create a basic tsconfig.json
cat > tsconfig.json << EOF
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
EOF

# Create a basic .env file
cat > .env << EOF
RPC_URL=https://indexing.staging.riselabs.xyz/
PRIVATE_KEY=your_private_key_here
EOF

# Create a test file for ethers.js
cat > test-ethers.ts << EOF
import { SyncTransactionProvider } from 'rise-shred-client';
import { Wallet } from 'ethers';
import 'dotenv/config';

async function main() {
  // Get credentials from environment
  const privateKey = process.env.PRIVATE_KEY || '0x';
  const rpcUrl = process.env.RPC_URL || 'https://indexing.staging.riselabs.xyz/';
  
  // Create provider
  const provider = new SyncTransactionProvider(rpcUrl);
  
  // Get network info
  const network = await provider.getNetwork();
  console.log('Connected to network:', network.name, 'with chainId:', network.chainId);
  
  // Create wallet
  const wallet = new Wallet(privateKey, provider);
  console.log('Wallet address:', wallet.address);
  
  // Get balance
  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', balance.toString());
}

main().catch(console.error);
EOF

# Create a test file for viem
cat > test-viem.ts << EOF
import { createSyncPublicClient, syncTransport } from 'rise-shred-client';
import { createWalletClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import 'dotenv/config';

async function main() {
  // Get credentials from environment
  const privateKey = process.env.PRIVATE_KEY || '0x';
  const rpcUrl = process.env.RPC_URL || 'https://indexing.staging.riselabs.xyz/';
  
  // Ensure private key has 0x prefix
  const formattedKey = privateKey.startsWith('0x') ? privateKey : \`0x\${privateKey}\`;
  const account = privateKeyToAccount(formattedKey as \`0x\${string}\`);
  console.log('Account address:', account.address);
  
  // Create transport and client
  const transport = syncTransport(rpcUrl);
  const client = createSyncPublicClient({ transport });
  
  // Get chain ID
  const chainId = await client.getChainId();
  console.log('Connected to network with chainId:', chainId);
  
  // Get balance
  const balance = await client.getBalance({ address: account.address });
  console.log('Balance:', balance.toString());
}

main().catch(console.error);
EOF

# Create package.json scripts
npm pkg set scripts.test-ethers="ts-node test-ethers.ts"
npm pkg set scripts.test-viem="ts-node test-viem.ts"

echo ""
echo "Test project setup complete!"
echo "Directory: $TEST_DIR"
echo ""
echo "To test the package:"
echo "1. Add your private key to .env"
echo "2. Run 'npm run test-ethers' to test with ethers.js"
echo "3. Run 'npm run test-viem' to test with viem"
echo ""