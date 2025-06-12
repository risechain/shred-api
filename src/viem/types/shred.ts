import type { AccessList, Address, Hex, TransactionBase } from 'viem'

export type ShredTransactionBase<
  quantity = bigint,
  index = number,
  status = 'success' | 'reverted',
> = Omit<
  TransactionBase<quantity, index>,
  'blockHash' | 'blockNumber' | 'transactionIndex' | 'from' | 'yParity'
> & {
  chainId: index
  status: status
  cumulativeGasUsed: quantity
  logs: {
    address: Address
    topics: Hex[]
    data: Hex
  }
}

export type ShredTransactionLegacy<
  quantity = bigint,
  index = number,
  status = 'success' | 'reverted',
  type = 'legacy',
> = Omit<ShredTransactionBase<quantity, index, status>, 'yParity'> & {
  gasPrice: quantity
  type: type
}

export type ShredTransactionEIP1559<
  quantity = bigint,
  index = number,
  status = 'success' | 'reverted',
  type = 'eip1559',
> = ShredTransactionBase<quantity, index, status> & {
  maxFeePerGas: quantity
  maxPriorityFeePerGas: quantity
  accessList: AccessList
  type: type
}

export type ShredStateChange<quantity = bigint, index = number> = {
  address: Address
  nonce: index
  balance: quantity
  storageChanges: {
    slot: Hex
    value: Hex
  }[]
  newCode: Hex | null
}

export type Shred = {
  blockNumber: bigint
  shredIndex: number
  transactions: (ShredTransactionEIP1559 | ShredTransactionLegacy)[]
  stateChanges: ShredStateChange[]
}

export type RpcShredTransactionEIP1559 = Omit<
  ShredTransactionEIP1559<Hex, Hex, '0x0' | '0x1', Hex>,
  'logs' | 'cumulativeGasUsed' | 'status'
>

export type RpcShredTransactionReceiptEIP1559 = {
  Eip1559: Pick<
    ShredTransactionEIP1559<Hex, Hex, '0x0' | '0x1', Hex>,
    'logs' | 'cumulativeGasUsed' | 'status'
  >
}

export type RpcShredTransactionLegacy = Omit<
  ShredTransactionLegacy<Hex, Hex, '0x0' | '0x1', Hex>,
  'logs' | 'cumulativeGasUsed' | 'status'
>

export type RpcShredTransactionReceiptLegacy = {
  Legacy: Pick<
    ShredTransactionLegacy<Hex, Hex, '0x0' | '0x1', Hex>,
    'logs' | 'cumulativeGasUsed' | 'status'
  >
}

export type RpcShredStateChanges = {
  [k: Address]: {
    nonce: number
    balance: Hex
    storage: {
      [k: Hex]: Hex
    }
    new_code: Hex | null
  }
}

export type RpcShred = {
  block_number: number
  shred_idx: number
  transactions: (
    | {
        transaction: RpcShredTransactionLegacy
        receipt: RpcShredTransactionReceiptLegacy
      }
    | {
        transaction: RpcShredTransactionEIP1559
        receipt: RpcShredTransactionReceiptEIP1559
      }
  )[]
  state_changes: RpcShredStateChanges
}
