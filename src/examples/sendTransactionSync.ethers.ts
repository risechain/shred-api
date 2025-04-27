import { JsonRpcProvider, parseEther, TransactionReceipt, Wallet } from "ethers";
import { SyncTransactionProvider } from "../middleware/syncTransactionProvider";
import 'dotenv/config';


/**
 * Example function to create and send a transaction using eth_sendRawTransactionSync
 */
export async function sendTransactionWithSync(
  rpcUrl: string,
  privateKey: string,
  data: string = '0x'
): Promise<TransactionReceipt> {
  // Create custom provider with sync transaction support
  const provider = new SyncTransactionProvider(rpcUrl);
  
  // Get network info to retrieve chainId
  const network = await provider.getNetwork();
  console.log("Connected to network:", network.name, "with chainId:", network.chainId);
  
  // Create wallet
  const wallet = new Wallet(privateKey, provider);
  
  // Create transaction object with explicit chainId
  const tx = {
    to: wallet.address,
    value: parseEther('0.0'),
    gasLimit: 21000,
    data,
    nonce: await wallet.getNonce(),
    gasPrice: (await provider.getFeeData()).gasPrice,
    chainId: network.chainId,
  };

  // Sign the transaction
  const signedTx = await wallet.signTransaction(tx);
  
  // Send the transaction and get receipt in one call
  console.time('Transaction Latency')
  const receipt = await provider.sendRawTransactionSync(signedTx);
  console.timeEnd('Transaction Latency')
  return receipt
}

/**
 * Example usage script
 */
export async function main() {
  const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
  const privateKey = process.env.PRIVATE_KEY || '0x'
  
  console.log('Sending transaction with sync receipt...');
  const receipt = await sendTransactionWithSync(rpcUrl, privateKey);
  
  console.log('Transaction sent and mined in a single call!');
  console.log('Transaction hash:', receipt.hash);
  console.log('Block number:', receipt.blockNumber.toString());
  console.log('Gas used:', receipt.gasUsed.toString());
  
  return receipt;
}

main()