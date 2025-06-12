import {
  sendRawTransactionSync,
  type SendRawTransactionSyncParameters,
  type SendRawTransactionSyncReturnType,
} from '../../actions/shred/sendRawTransactionSync'
import type { ShredRpcSchema } from '../../types/rpcSchema'
import type { Account, Chain, Client, RpcSchema, Transport } from 'viem'

/**
 * Actions for interacting with Shreds on the RISE network, enabling real-time
 * transaction confirmation by processing blocks in smaller, instantly confirmed units.
 */
export type SyncActions<chain extends Chain | undefined = undefined> = {
  /**
   * Sends a raw transaction to the RISE network, where it is processed as a shred,
   * and waits for its real-time confirmation.
   *
   * @param parameters - {@link SendRawTransactionSyncParameters}
   * @returns The transaction hash. {@link SendRawTransactionSyncReturnType}
   */
  sendRawTransactionSync: (
    parameters: SendRawTransactionSyncParameters,
  ) => Promise<SendRawTransactionSyncReturnType<chain>>
}

export function syncActions<
  transport extends Transport,
  chain extends Chain | undefined = undefined,
  account extends Account | undefined = undefined,
  rpcSchema extends [...RpcSchema, ...ShredRpcSchema] | undefined = undefined,
>(client: Client<transport, chain, account, rpcSchema>): SyncActions<chain> {
  return {
    sendRawTransactionSync: (args) => sendRawTransactionSync(client, args),
  }
}
