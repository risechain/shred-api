import {
  sendRawTransactionSync,
  type SendRawTransactionSyncParameters,
  type SendRawTransactionSyncReturnType,
} from '../../actions/shred/sendRawTransactionSync'
import {
  watchShreds,
  type WatchShredsParameters,
  type WatchShredsReturnType,
} from '../../actions/shred/watchShreds'
import type { Account, Chain, Client, Transport } from 'viem'

/**
 * Actions for interacting with Shreds on the RISE network, enabling real-time
 * transaction confirmation by processing blocks in smaller, instantly confirmed units.
 */
export type ShredActions<chain extends Chain | undefined = undefined> = {
  /**
   * Watches for new shreds on the RISE network.
   *
   * @param parameters - {@link WatchShredsParameters}
   * @returns A function that can be used to unsubscribe from the shred.
   */
  watchShreds: (parameters: WatchShredsParameters) => WatchShredsReturnType
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

export function shredActions<
  transport extends Transport,
  chain extends Chain | undefined = undefined,
  account extends Account | undefined = undefined,
>(client: Client<transport, chain, account>): ShredActions {
  return {
    watchShreds: (args) => watchShreds(client, args),
    sendRawTransactionSync: (args) => sendRawTransactionSync(client, args),
  }
}
