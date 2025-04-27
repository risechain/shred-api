import { 
  createPublicClient, 
  type PublicClient, 
  type TransactionReceipt,
  type Chain
} from 'viem'

/**
 * Extension for PublicClient to add synchronous transaction functionality
 */
export type SyncPublicClient = PublicClient & {
  sendRawTransactionSync: (signedTransaction: `0x${string}`) => Promise<TransactionReceipt>
}

/**
 * Creates a public client with sync transaction support
 */
export function createSyncPublicClient({
  transport,
  chain,
}: {
  transport: any
  chain?: Chain
}): SyncPublicClient {
  // Create base public client
  const client = createPublicClient({
    transport,
    chain,
  })
  
  // Add custom sync method
  return {
    ...client,
    sendRawTransactionSync: async (signedTransaction: `0x${string}`): Promise<TransactionReceipt> => {
      // Ensure transaction starts with 0x
      if (!signedTransaction.startsWith('0x')) {
        signedTransaction = `0x${signedTransaction}` as `0x${string}`
      }
      
      // Call the custom RPC method using any type to bypass method name validation
      const receipt = await (client as any).request({
        method: 'eth_sendRawTransactionSync',
        params: [signedTransaction]
      }) as TransactionReceipt
      
      return receipt
    }
  }
}