import type {
  AccessList,
  Address,
  Hex,
  OneOf,
  SignedAuthorizationList,
  TransactionBase,
} from 'viem'

export type ShredTransactionBase<
  quantity = bigint,
  index = number,
  status = 'success' | 'reverted',
> = Omit<
  TransactionBase<quantity, index>,
  'blockHash' | 'blockNumber' | 'transactionIndex' | 'yParity'
> & {
  chainId?: index
  signer: Address
  status: status
  cumulativeGasUsed: quantity
  logs: {
    address: Address
    topics: Hex[]
    data: Hex
  }[]
}

export type ShredTransactionLegacy<
  quantity = bigint,
  index = number,
  status = 'success' | 'reverted',
  type = 'legacy',
> = ShredTransactionBase<quantity, index, status> & {
  gasPrice: quantity
  type: type
}

export type ShredTransactionEip2930<
  quantity = bigint,
  index = number,
  status = 'success' | 'reverted',
  type = 'eip2930',
> = ShredTransactionBase<quantity, index, status> & {
  type: type
  gasPrice: quantity
  accessList: AccessList
}

export type ShredTransactionEip1559<
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

export type ShredTransactionEip7702<
  quantity = bigint,
  index = number,
  status = 'success' | 'reverted',
  type = 'eip7702',
> = ShredTransactionBase<quantity, index, status> & {
  maxFeePerGas: quantity
  maxPriorityFeePerGas: quantity
  accessList: AccessList
  authorizationList: SignedAuthorizationList
  type: type
}

export type ShredDepositTransaction<
  quantity = bigint,
  index = number,
  status = 'success' | 'reverted',
  type = 'deposit',
> = ShredTransactionBase<quantity, index, status> & {
  sourceHash: Hex
  mint: quantity
  isSystemTransaction: boolean
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

export type ShredTransaction = OneOf<
  | ShredTransactionEip1559
  | ShredTransactionLegacy
  | ShredTransactionEip2930
  | ShredTransactionEip7702
  | ShredDepositTransaction
>

export type Shred = {
  blockTimestamp: bigint
  blockNumber: bigint
  shredIndex: number
  startingLogIndex: number
  transactions: ShredTransaction[]
  stateChanges: ShredStateChange[]
}

export type RpcShredTransactionEip1559 = Omit<
  ShredTransactionEip1559<Hex, Hex, '0x0' | '0x1', Hex>,
  'logs' | 'cumulativeGasUsed' | 'status' | 'from'
>

export type RpcShredTransactionReceiptEip1559 = {
  Eip1559: Pick<
    ShredTransactionEip1559<Hex, Hex, '0x0' | '0x1', Hex>,
    'logs' | 'cumulativeGasUsed' | 'status'
  >
}

export type RpcShredTransactionLegacy = Omit<
  ShredTransactionLegacy<Hex, Hex, '0x0' | '0x1', Hex>,
  'logs' | 'cumulativeGasUsed' | 'status' | 'from'
>

export type RpcShredTransactionReceiptLegacy = {
  Legacy: Pick<
    ShredTransactionLegacy<Hex, Hex, '0x0' | '0x1', Hex>,
    'logs' | 'cumulativeGasUsed' | 'status'
  >
}

export type RpcShredTransactionEip2930 = Omit<
  ShredTransactionEip2930<Hex, Hex, '0x0' | '0x1', Hex>,
  'logs' | 'cumulativeGasUsed' | 'status' | 'from'
>

export type RpcShredTransactionReceiptEip2930 = {
  Eip2930: Pick<
    ShredTransactionEip2930<Hex, Hex, '0x0' | '0x1', Hex>,
    'logs' | 'cumulativeGasUsed' | 'status'
  >
}

export type RpcShredTransactionEip7702 = Omit<
  ShredTransactionEip7702<Hex, Hex, '0x0' | '0x1', Hex>,
  'logs' | 'cumulativeGasUsed' | 'status' | 'from'
>

export type RpcShredTransactionReceiptEip7702 = {
  Eip7702: Pick<
    ShredTransactionEip7702<Hex, Hex, '0x0' | '0x1', Hex>,
    'logs' | 'cumulativeGasUsed' | 'status'
  >
}

export type RpcShredDepositTransaction = Omit<
  ShredDepositTransaction<Hex, Hex, '0x0' | '0x1', Hex>,
  'logs' | 'cumulativeGasUsed' | 'status' | 'chainId' | 'nonce'
>

export type RpcShredTransactionReceiptDeposit = {
  Deposit: Pick<
    ShredDepositTransaction<Hex, Hex, '0x0' | '0x1', Hex>,
    'logs' | 'cumulativeGasUsed' | 'status'
  > & {
    depositNonce: Hex
  }
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

export type RpcShredTransaction = OneOf<
  | {
      transaction: RpcShredTransactionLegacy
      receipt: RpcShredTransactionReceiptLegacy
    }
  | {
      transaction: RpcShredTransactionEip2930
      receipt: RpcShredTransactionReceiptEip2930
    }
  | {
      transaction: RpcShredTransactionEip1559
      receipt: RpcShredTransactionReceiptEip1559
    }
  | {
      transaction: RpcShredTransactionEip7702
      receipt: RpcShredTransactionReceiptEip7702
    }
  | {
      transaction: RpcShredDepositTransaction
      receipt: RpcShredTransactionReceiptDeposit
    }
>

export type RpcShred = {
  block_number: number
  shred_idx: number
  block_timestamp: number
  starting_log_index: number
  transactions: RpcShredTransaction[]
  state_changes?: RpcShredStateChanges
}
