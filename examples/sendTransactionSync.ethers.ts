import { SyncTransactionProvider } from 'rise-shred-client';
import { Wallet, parseEther } from 'ethers';
import 'dotenv/config';

async function main() {
  // Get credentials from environment or use placeholders
  const privateKey = process.env.PRIVATE_KEY || '0x';
  const rpcUrl = process.env.RPC_URL || 'https://indexing.staging.riselabs.xyz/';
  
  // Create provider with RPC URL from environment
  const provider = new SyncTransactionProvider(rpcUrl);
  
  // Get network to retrieve chain ID
  const network = await provider.getNetwork();
  console.log('Connected to network:', network.name, 'with chainId:', network.chainId);
  
  // Create wallet
  const wallet = new Wallet(privateKey, provider);
  
  // Create transaction object with explicit chainId
  const tx = {
    to: wallet.address,
    value: parseEther('0.0'),
    gasLimit: 21000,
    data: '0x',
    nonce: await wallet.getNonce(),
    gasPrice: (await provider.getFeeData()).gasPrice,
    chainId: network.chainId,
  };

  console.log('Signing transaction...');
  const signedTx = await wallet.signTransaction(tx);
  
  console.log('Sending transaction with sync receipt...');
  // Send the transaction and get receipt in one call
  const receipt = await provider.sendRawTransactionSync(signedTx);
  
  console.log('Transaction sent and mined in a single call!');
  console.log('Transaction hash:', receipt.hash);
  console.log('Block number:', receipt.blockNumber.toString());
  console.log('Gas used:', receipt.gasUsed.toString());
}

main().catch(console.error);