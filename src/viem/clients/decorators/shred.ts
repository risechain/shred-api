import {
  sendRawTransactionSync,
  type SendRawTransactionSyncParameters,
  type SendRawTransactionSyncReturnType,
} from '../../actions/shred/sendRawTransactionSync'
import {
  watchContractShredEvent,
  type WatchContractShredEventParameters,
  type WatchContractShredEventReturnType,
} from '../../actions/shred/watchContractShredEvent'
import {
  watchShredEvent,
  type WatchShredEventParameters,
  type WatchShredEventReturnType,
} from '../../actions/shred/watchShredEvent'
import type { ShredRpcSchema } from '../../types/rpcSchema'
import type { ShredsWebSocketTransport } from '../transports/shredsWebSocket'
import type {
  Abi,
  AbiEvent,
  Account,
  Chain,
  Client,
  ContractEventName,
  RpcSchema,
} from 'viem'

/**
 * Actions for interacting with Shreds on the RISE network, enabling real-time
 * transaction confirmation by processing blocks in smaller, instantly confirmed units.
 */
export type ShredActions<chain extends Chain | undefined = Chain | undefined> =
  {
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
    /**
     * Watches and returns emitted contract events that have been processed and confirmed as shreds
     * on the RISE network.
     *
     * @param parameters - {@link WatchContractShredEventParameters}
     * @returns A function that can be used to unsubscribe from the event. {@link WatchContractShredEventReturnType}
     */
    watchContractShredEvent: <
      const abi_ extends Abi | readonly unknown[],
      eventName_ extends ContractEventName<abi_> | undefined = undefined,
      strict extends boolean | undefined = undefined,
    >(
      parameters: WatchContractShredEventParameters<abi_, eventName_, strict>,
    ) => WatchContractShredEventReturnType
    /**
     * Watches and returns emitted events that have been processed and confirmed as shreds
     * on the RISE network.
     *
     * @param parameters - {@link WatchShredEventParameters}
     * @returns A function that can be used to unsubscribe from the event. {@link WatchShredEventReturnType}
     */
    watchShredEvent: <
      const abiEvent extends AbiEvent | undefined = undefined,
      const abiEvents extends
        | readonly AbiEvent[]
        | readonly unknown[]
        | undefined = abiEvent extends AbiEvent ? [abiEvent] : undefined,
      strict extends boolean | undefined = undefined,
    >(
      parameters: WatchShredEventParameters<abiEvent, abiEvents, strict>,
    ) => WatchShredEventReturnType
  }

export function shredActions<
  transport extends ShredsWebSocketTransport,
  chain extends Chain | undefined = undefined,
  account extends Account | undefined = undefined,
  rpcSchema extends [...RpcSchema, ...ShredRpcSchema] | undefined = undefined,
>(client: Client<transport, chain, account, rpcSchema>): ShredActions<chain> {
  return {
    sendRawTransactionSync: (args) => sendRawTransactionSync(client, args),
    watchContractShredEvent: (args) => watchContractShredEvent(client, args),
    watchShredEvent: (args) => watchShredEvent(client, args),
  }
}
