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

export type ShredActions<chain extends Chain | undefined = Chain | undefined> =
  {
    sendRawTransactionSync: (
      parameters: SendRawTransactionSyncParameters,
    ) => Promise<SendRawTransactionSyncReturnType<chain>>
    watchContractShredEvent: <
      const abi_ extends Abi | readonly unknown[],
      eventName_ extends ContractEventName<abi_> | undefined = undefined,
      strict extends boolean | undefined = undefined,
    >(
      parameters: WatchContractShredEventParameters<abi_, eventName_, strict>,
    ) => WatchContractShredEventReturnType
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
