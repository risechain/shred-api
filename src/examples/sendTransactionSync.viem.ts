import { 
  createWalletClient, 
  http, 
  parseEther, 
  type TransactionReceipt,
  type Address,
  defineChain
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { syncTransport } from '../middleware/syncTransactionTransport'
import { createSyncPublicClient } from '../middleware/syncTransactionClient'
import 'dotenv/config'

/**
 * Example function to create and send a transaction using eth_sendRawTransactionSync
 */
export async function sendTransactionWithSync(
  rpcUrl: string,
  privateKey: string,
  data: `0x${string}` = '0x'
): Promise<TransactionReceipt> {
  // Create account from private key
  // Ensure the private key has 0x prefix
  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
  const account = privateKeyToAccount(formattedKey as `0x${string}`)
  
  // Create custom transport with sync transaction support
  const transport = syncTransport(rpcUrl)
  
  // Create sync public client
  const publicClient = createSyncPublicClient({
    transport,
  })
  
  // Create wallet client for signing transactions
  const walletClient = createWalletClient({
    account,
    transport: http(rpcUrl),
  })
  
  // Get chain ID from the network
  const chainId = await publicClient.getChainId()
  console.log("Connected to network with chainId:", chainId)
  
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
  })
  
  // Get nonce for the account
  const nonce = await publicClient.getTransactionCount({
    address: account.address,
    blockTag: 'latest',
  })
  // console.log("Nonce for account:", nonce.toString())
  // process.exit()
  
  // Get gas price
  const gasPrice = await publicClient.getGasPrice()
  
  // Sign the transaction (need to specify the chain explicitly for signTransaction)
  const signedTransaction = await walletClient.signTransaction({
    to: account.address,
    value: parseEther('0.0'),
    gas: 21000n,
    nonce,
    data,
    gasPrice,
    chain,
  })
  
  // Send the transaction and get receipt in one call
  console.time('Transaction Latency')
  const receipt = await publicClient.sendRawTransactionSync(signedTransaction)
  console.timeEnd('Transaction Latency')
  return receipt
}

/**
 * Example usage script
 */
export async function main() {
  const rpcUrl = process.env.RPC_URL || 'http://localhost:8545'
  const privateKey = process.env.PRIVATE_KEY || '0x'
  
  console.log('Sending transaction with sync receipt (viem)...')
  const receipt = await sendTransactionWithSync(rpcUrl, privateKey)
  
  console.log('Transaction sent and mined in a single call!')
  console.log('Transaction hash:', receipt.transactionHash)
  console.log('Block number:', receipt.blockNumber.toString())
  console.log('Gas used:', receipt.gasUsed.toString())
  
  return receipt
}

main().catch(console.error)