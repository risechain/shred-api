import { hexToBigInt, hexToNumber } from 'viem'
import type {
  RpcShred,
  RpcShredDepositTransaction,
  RpcShredStateChanges,
  RpcShredTransactionEip1559,
  RpcShredTransactionEip2930,
  RpcShredTransactionEip7702,
  RpcShredTransactionLegacy,
  RpcShredTransactionReceiptDeposit,
  Shred,
  ShredDepositTransaction,
  ShredStateChange,
  ShredTransactionEip1559,
  ShredTransactionEip2930,
  ShredTransactionEip7702,
  ShredTransactionLegacy,
} from '../../types/shred'

export const receiptStatuses = {
  '0x0': 'reverted',
  '0x1': 'success',
} as const

export function formatShredStateChange(
  stateChange: RpcShredStateChanges,
): ShredStateChange[] {
  return Object.entries(stateChange).map(([address, stateChange]) => {
    return {
      address: address as `0x${string}`,
      balance: BigInt(stateChange.balance),
      newCode: stateChange.newCode,
      nonce: stateChange.nonce,
      storageChanges: Object.entries(stateChange.storage).map(
        ([slot, value]) => {
          return {
            slot: slot as `0x${string}`,
            value,
          }
        },
      ),
    }
  })
}

export function formatShred(shred: RpcShred, chainId: number): Shred {
  return {
    blockNumber: BigInt(shred.blockNumber),
    shredIndex: shred.shredIdx,
    blockTimestamp: BigInt(shred.blockTimestamp),
    startingLogIndex: shred.startingLogIndex,
    stateChanges: shred.stateChanges
      ? formatShredStateChange(shred.stateChanges)
      : [],
    transactions: shred.transactions.map(({ receipt, transaction }) => {
      const txChainId =
        'chainId' in transaction && transaction.chainId
          ? hexToNumber(transaction.chainId)
          : chainId

      const receiptType = receipt.type

      if (receiptType === '0x0') {
        // Legacy transaction
        const tx = transaction as RpcShredTransactionLegacy
        const formattedTx = {
          ...tx,
          chainId: txChainId,
          cumulativeGasUsed: BigInt(receipt.cumulativeGasUsed),
          gas: BigInt(tx.gas),
          gasPrice: BigInt(tx.gasPrice),
          status: receiptStatuses[receipt.status],
          nonce: hexToNumber(tx.nonce),
          type: 'legacy',
          typeHex: tx.type,
          value: BigInt(tx.value),
          logs: receipt.logs,
          v: hexToBigInt(tx.v),
          from: tx.signer,
        } satisfies ShredTransactionLegacy
        return formattedTx
      } else if (receiptType === '0x2') {
        // EIP-1559 transaction
        const tx = transaction as RpcShredTransactionEip1559
        const formattedTx = {
          ...tx,
          chainId: txChainId,
          cumulativeGasUsed: BigInt(receipt.cumulativeGasUsed),
          gas: BigInt(tx.gas),
          maxFeePerGas: BigInt(tx.maxFeePerGas),
          maxPriorityFeePerGas: BigInt(tx.maxPriorityFeePerGas),
          status: receiptStatuses[receipt.status],
          nonce: hexToNumber(tx.nonce),
          type: 'eip1559',
          typeHex: tx.type,
          value: BigInt(tx.value),
          logs: receipt.logs,
          v: BigInt(tx.v),
          from: tx.signer,
        } satisfies ShredTransactionEip1559
        return formattedTx
      } else if (receiptType === '0x1') {
        // EIP-2930 transaction
        const tx = transaction as RpcShredTransactionEip2930
        const formattedTx = {
          ...tx,
          chainId: txChainId,
          cumulativeGasUsed: BigInt(receipt.cumulativeGasUsed),
          gas: BigInt(tx.gas),
          status: receiptStatuses[receipt.status],
          nonce: hexToNumber(tx.nonce),
          type: 'eip2930',
          typeHex: tx.type,
          value: BigInt(tx.value),
          logs: receipt.logs,
          v: BigInt(tx.v),
          gasPrice: BigInt(tx.gasPrice),
          from: tx.signer,
        } satisfies ShredTransactionEip2930
        return formattedTx
      } else if (receiptType === '0x4') {
        // EIP-7702 transaction
        const tx = transaction as RpcShredTransactionEip7702
        const formattedTx = {
          ...tx,
          chainId: txChainId,
          cumulativeGasUsed: BigInt(receipt.cumulativeGasUsed),
          gas: BigInt(tx.gas),
          maxFeePerGas: BigInt(tx.maxFeePerGas),
          maxPriorityFeePerGas: BigInt(tx.maxPriorityFeePerGas),
          status: receiptStatuses[receipt.status],
          nonce: hexToNumber(tx.nonce),
          type: 'eip7702',
          typeHex: tx.type,
          value: BigInt(tx.value),
          logs: receipt.logs,
          v: BigInt(tx.v),
          from: tx.signer,
        } satisfies ShredTransactionEip7702
        return formattedTx
      } else if (receiptType === '0x7e') {
        // Deposit transaction
        const tx = transaction as RpcShredDepositTransaction
        const depositReceipt = receipt as RpcShredTransactionReceiptDeposit
        return {
          ...tx,
          chainId,
          cumulativeGasUsed: BigInt(receipt.cumulativeGasUsed),
          gas: BigInt(tx.gas),
          status: receiptStatuses[receipt.status],
          nonce: hexToNumber(depositReceipt.depositNonce),
          type: 'deposit',
          typeHex: tx.type,
          value: BigInt(tx.value),
          logs: receipt.logs,
          v: BigInt(tx.v),
          mint: BigInt(tx.mint),
          from: tx.from,
        } satisfies ShredDepositTransaction
      } else {
        throw new Error(`Unknown tx type: ${receiptType}`)
      }
    }),
  }
}
