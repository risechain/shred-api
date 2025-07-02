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
import {
  watchShreds,
  type WatchShredsParameters,
  type WatchShredsReturnType,
} from '../../actions/shred/watchShreds'
import type { ShredsWebSocketTransport } from '../transports/shredsWebSocket'
import type {
  Abi,
  AbiEvent,
  Account,
  Chain,
  Client,
  ContractEventName,
  FallbackTransport,
  Transport,
} from 'viem'

/**
 * Actions for interacting with Shreds on the RISE network, enabling real-time
 * transaction confirmation by processing blocks in smaller, instantly confirmed units.
 */
export type ShredActions = {
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
  ) => Promise<WatchContractShredEventReturnType>
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
  ) => Promise<WatchShredEventReturnType>
  /**
   * Watches for new shreds on the RISE network.
   *
   * @param parameters - {@link WatchShredsParameters}
   * @returns A function that can be used to unsubscribe from the shred.
   */
  watchShreds: (
    parameters: WatchShredsParameters,
  ) => Promise<WatchShredsReturnType>
}

export function shredActions<
  transport extends
    | ShredsWebSocketTransport
    | FallbackTransport<readonly [ShredsWebSocketTransport, ...Transport[]]>,
  chain extends Chain | undefined = undefined,
  account extends Account | undefined = undefined,
>(client: Client<transport, chain, account>): ShredActions {
  return {
    watchContractShredEvent: (args) => watchContractShredEvent(client, args),
    watchShredEvent: (args) => watchShredEvent(client, args),
    watchShreds: (args) => watchShreds(client, args),
  }
}
