import { createSyncPublicClient, syncTransport } from 'rise-shred-client';
import { parseEther, defineChain, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import 'dotenv/config';

async function main() {
  // Get credentials from environment or use placeholders
  const privateKey = process.env.PRIVATE_KEY || '0x';
  const rpcUrl = process.env.RPC_URL || 'https://indexing.staging.riselabs.xyz/';
  
  // Ensure private key has 0x prefix
  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(formattedKey as `0x${string}`);
  
  // Create custom transport with sync transaction support
  const transport = syncTransport(rpcUrl);
  
  // Create sync public client
  const publicClient = createSyncPublicClient({
    transport,
  });
  
  // Get chain ID
  const chainId = await publicClient.getChainId();
  console.log('Connected to network with chainId:', chainId);
  
  // Define chain with the detected chain ID
  const chain = defineChain({
    id: chainId,
    name: 'Dynamic Chain',
    nativeCurrency: {
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    rpcUrls: {
      default: { http: [rpcUrl] },
    },
  });
  
  // Create wallet client
  const walletClient = createWalletClient({
    account,
    transport: http(rpcUrl),
  });
  
  // Get account nonce
  const nonce = await publicClient.getTransactionCount({
    address: account.address,
  });
  
  // Get gas price
  const gasPrice = await publicClient.getGasPrice();
  
  console.log('Signing transaction...');
  // Sign the transaction
  const signedTransaction = await walletClient.signTransaction({
    to: account.address,
    value: parseEther('0.0'),
    gas: 21000n,
    nonce,
    data: '0x',
    gasPrice,
    chain,
  });
  
  console.log('Sending transaction with sync receipt...');
  // Send the transaction and get receipt in one call
  const receipt = await publicClient.sendRawTransactionSync(signedTransaction);
  
  console.log('Transaction sent and mined in a single call!');
  console.log('Transaction hash:', receipt.transactionHash);
  console.log('Block number:', receipt.blockNumber.toString());
  console.log('Gas used:', receipt.gasUsed.toString());
}

main().catch(console.error);