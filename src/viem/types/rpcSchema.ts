import type { Hex, TransactionReceipt } from 'viem'

export type ShredRpcSchema = [
  {
    Method: 'eth_sendRawTransactionSync'
    Parameters: [signedTransaction: Hex]
    ReturnType: TransactionReceipt
  },
]
