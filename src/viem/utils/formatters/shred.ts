import { hexToBigInt, hexToNumber } from 'viem'
import type {
  RpcShred,
  RpcShredDepositTransaction,
  RpcShredStateChanges,
  RpcShredTransactionEip1559,
  RpcShredTransactionEip2930,
  RpcShredTransactionEip7702,
  RpcShredTransactionLegacy,
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
      newCode: stateChange.new_code,
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
    blockNumber: BigInt(shred.block_number),
    shredIndex: shred.shred_idx,
    blockTimestamp: BigInt(shred.block_timestamp),
    startingLogIndex: shred.starting_log_index,
    stateChanges: shred.state_changes
      ? formatShredStateChange(shred.state_changes)
      : [],
    transactions: shred.transactions.map(({ receipt, transaction }) => {
      const txChainId =
        'chainId' in transaction && transaction.chainId
          ? hexToNumber(transaction.chainId)
          : chainId
      if ('Legacy' in receipt) {
        const tx = transaction as RpcShredTransactionLegacy
        const formattedTx = {
          ...tx,
          chainId: txChainId,
          cumulativeGasUsed: BigInt(receipt.Legacy.cumulativeGasUsed),
          gas: BigInt(tx.gas),
          gasPrice: BigInt(tx.gasPrice),
          status: receiptStatuses[receipt.Legacy.status],
          nonce: hexToNumber(tx.nonce),
          type: 'legacy',
          typeHex: tx.type,
          value: BigInt(tx.value),
          logs: receipt.Legacy.logs,
          v: hexToBigInt(tx.v),
          from: tx.signer,
        } satisfies ShredTransactionLegacy
        return formattedTx
      } else if ('Eip1559' in receipt) {
        const tx = transaction as RpcShredTransactionEip1559
        const formattedTx = {
          ...tx,
          chainId: txChainId,
          cumulativeGasUsed: BigInt(receipt.Eip1559.cumulativeGasUsed),
          gas: BigInt(tx.gas),
          maxFeePerGas: BigInt(tx.maxFeePerGas),
          maxPriorityFeePerGas: BigInt(tx.maxPriorityFeePerGas),
          status: receiptStatuses[receipt.Eip1559.status],
          nonce: hexToNumber(tx.nonce),
          type: 'eip1559',
          typeHex: tx.type,
          value: BigInt(tx.value),
          logs: receipt.Eip1559.logs,
          v: BigInt(tx.v),
          from: tx.signer,
        } satisfies ShredTransactionEip1559
        return formattedTx
      } else if ('Eip2930' in receipt) {
        const tx = transaction as RpcShredTransactionEip2930
        const formattedTx = {
          ...tx,
          chainId: txChainId,
          cumulativeGasUsed: BigInt(receipt.Eip2930.cumulativeGasUsed),
          gas: BigInt(tx.gas),
          status: receiptStatuses[receipt.Eip2930.status],
          nonce: hexToNumber(tx.nonce),
          type: 'eip2930',
          typeHex: tx.type,
          value: BigInt(tx.value),
          logs: receipt.Eip2930.logs,
          v: BigInt(tx.v),
          gasPrice: BigInt(tx.gasPrice),
          from: tx.signer,
        } satisfies ShredTransactionEip2930
        return formattedTx
      } else if ('Eip7702' in receipt) {
        const tx = transaction as RpcShredTransactionEip7702
        const formattedTx = {
          ...tx,
          chainId: txChainId,
          cumulativeGasUsed: BigInt(receipt.Eip7702.cumulativeGasUsed),
          gas: BigInt(tx.gas),
          maxFeePerGas: BigInt(tx.maxFeePerGas),
          maxPriorityFeePerGas: BigInt(tx.maxPriorityFeePerGas),
          status: receiptStatuses[receipt.Eip7702.status],
          nonce: hexToNumber(tx.nonce),
          type: 'eip7702',
          typeHex: tx.type,
          value: BigInt(tx.value),
          logs: receipt.Eip7702.logs,
          v: BigInt(tx.v),
          from: tx.signer,
        } satisfies ShredTransactionEip7702
        return formattedTx
      } else if ('Deposit' in receipt) {
        const tx = transaction as RpcShredDepositTransaction
        return {
          ...tx,
          chainId,
          cumulativeGasUsed: BigInt(receipt.Deposit.cumulativeGasUsed),
          gas: BigInt(tx.gas),
          status: receiptStatuses[receipt.Deposit.status],
          nonce: hexToNumber(receipt.Deposit.depositNonce),
          type: 'deposit',
          typeHex: tx.type,
          value: BigInt(tx.value),
          logs: receipt.Deposit.logs,
          v: BigInt(tx.v),
          mint: BigInt(tx.mint),
          from: tx.from,
        } satisfies ShredDepositTransaction
      } else {
        throw new Error('Unknown tx type')
      }
    }),
  }
}
