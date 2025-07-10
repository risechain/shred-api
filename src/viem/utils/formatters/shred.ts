import {
  hexToBigInt,
  hexToNumber,
  keccak256,
  recoverAddress,
  serializeTransaction,
  type Address,
  type Signature,
  type TransactionSerializable,
  type TransactionSerializableEIP1559,
  type TransactionSerializableEIP2930,
  type TransactionSerializableEIP7702,
  type TransactionSerializableLegacy,
} from 'viem'
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

export async function formatShred(
  shred: RpcShred,
  chainId: number,
): Promise<Shred> {
  return {
    blockNumber: BigInt(shred.block_number),
    shredIndex: shred.shred_idx,
    blockTimestamp: BigInt(shred.block_timestamp),
    startingLogIndex: shred.starting_log_index,
    stateChanges: formatShredStateChange(shred.state_changes),
    transactions: await Promise.all(
      shred.transactions.map(async ({ receipt, transaction }) => {
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
            from: '0x0' as Address, // Placeholder, will be set after recovery
          } satisfies ShredTransactionLegacy
          const recoveredFrom =
            await recoverFrom<TransactionSerializableLegacy>(formattedTx, {
              r: formattedTx.r,
              s: formattedTx.s,
              v: formattedTx.v,
            })
          formattedTx.from = recoveredFrom
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
            from: '0x0' as Address, // Placeholder, will be set after recovery
          } satisfies ShredTransactionEip1559
          const recoveredFrom =
            await recoverFrom<TransactionSerializableEIP1559>(formattedTx, {
              r: formattedTx.r,
              s: formattedTx.s,
              v: formattedTx.v,
            })
          formattedTx.from = recoveredFrom
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
            from: '0x0' as Address, // Placeholder, will be set after recovery
          } satisfies ShredTransactionEip2930
          const recoveredFrom =
            await recoverFrom<TransactionSerializableEIP2930>(formattedTx, {
              r: formattedTx.r,
              s: formattedTx.s,
              v: formattedTx.v,
            })
          formattedTx.from = recoveredFrom
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
            from: '0x0' as Address, // Placeholder, will be set after recovery
          } satisfies ShredTransactionEip7702
          const recoveredFrom =
            await recoverFrom<TransactionSerializableEIP7702>(formattedTx, {
              r: formattedTx.r,
              s: formattedTx.s,
              v: formattedTx.v,
            })
          formattedTx.from = recoveredFrom
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
    ),
  }
}

function recoverFrom<Tx extends TransactionSerializable>(
  tx: Tx,
  signature: Signature,
) {
  const serialized = serializeTransaction<Tx>({
    ...tx,
    data: (tx as any).input,
    r: undefined,
    s: undefined,
    v: undefined,
    yParity: undefined,
  })
  const hashed = keccak256(serialized)
  return recoverAddress({
    hash: hashed,
    signature: {
      ...signature,
      yParity: vToYParity(Number(signature.v!)),
    },
  })
}

export function vToYParity(v: number): number {
  if (v === 0 || v === 27) return 0
  if (v === 1 || v === 28) return 1
  if (v >= 35) return v % 2 === 0 ? 1 : 0
  throw new Error(`Invalid v value: ${v}. Expected 0, 1, 27, 28, or >= 35.`)
}
