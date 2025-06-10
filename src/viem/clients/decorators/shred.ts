import {
  sendRawTransactionSync,
  type SendRawTransactionSyncParameters,
  type SendRawTransactionSyncReturnType,
} from '../../actions/shred/SendRawTransactionSync'
import type { ShredRpcSchema } from '../../types/RpcSchema'
import type { Account, Chain, Client, RpcSchema, Transport } from 'viem'

export type ShredActions<chain extends Chain | undefined = Chain | undefined> =
  {
    sendRawTransactionSync: (
      parameters: SendRawTransactionSyncParameters,
    ) => Promise<SendRawTransactionSyncReturnType<chain>>
  }

export function shredActions<
  transport extends Transport,
  chain extends Chain | undefined = undefined,
  account extends Account | undefined = undefined,
  rpcSchema extends [...RpcSchema, ...ShredRpcSchema] | undefined = undefined,
>(client: Client<transport, chain, account, rpcSchema>): ShredActions<chain> {
  return {
    sendRawTransactionSync: (args) => sendRawTransactionSync(client, args),
  }
}
