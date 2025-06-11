import {
  decodeEventLog,
  DecodeLogDataMismatch,
  DecodeLogTopicsMismatch,
  encodeEventTopics,
  formatLog,
  type Chain,
  type Client,
  type ContractEventArgs,
  type ContractEventName,
  type EncodeEventTopicsParameters,
  type LogTopic,
} from 'viem'
import type { ShredsWebSocketTransport } from '../../clients/transports/shredsWebSocket'
import type { ShredLog } from '../../types/log'
import type { Abi, Address, ExtractAbiEvent } from 'abitype'

export type WatchContractShredEventOnLogsParameter<
  abi extends Abi | readonly unknown[] = Abi,
  eventName extends ContractEventName<abi> = ContractEventName<abi>,
  strict extends boolean | undefined = undefined,
> = abi extends Abi
  ? Abi extends abi
    ? ShredLog[]
    : ShredLog<bigint, number, ExtractAbiEvent<abi, eventName>, strict>[]
  : ShredLog[]

export type WatchContractShredEventOnLogsFn<
  abi extends Abi | readonly unknown[] = Abi,
  eventName extends ContractEventName<abi> = ContractEventName<abi>,
  strict extends boolean | undefined = undefined,
> = (
  logs: WatchContractShredEventOnLogsParameter<abi, eventName, strict>,
) => void

export type WatchContractShredEventParameters<
  abi extends Abi | readonly unknown[] = Abi,
  eventName extends ContractEventName<abi> | undefined = ContractEventName<abi>,
  strict extends boolean | undefined = undefined,
> = {
  /** The address of the contract. */
  address?: Address | Address[] | undefined
  /** Contract ABI. */
  abi: abi
  args?:
    | ContractEventArgs<
        abi,
        eventName extends ContractEventName<abi>
          ? eventName
          : ContractEventName<abi>
      >
    | undefined
  /** Contract event. */
  eventName?: eventName | ContractEventName<abi> | undefined
  /** The callback to call when an error occurred when trying to get for a new block. */
  onError?: ((error: Error) => void) | undefined
  /** The callback to call when new event logs are received. */
  onLogs: WatchContractShredEventOnLogsFn<
    abi,
    eventName extends ContractEventName<abi>
      ? eventName
      : ContractEventName<abi>,
    strict
  >
  /**
   * Whether or not the logs must match the indexed/non-indexed arguments on `event`.
   * @default false
   */
  strict?: strict | boolean | undefined
}

export type WatchContractShredEventReturnType = () => void

export function watchContractShredEvent<
  chain extends Chain | undefined,
  const abi_ extends Abi | readonly unknown[],
  eventName_ extends ContractEventName<abi_> | undefined = undefined,
  strict extends boolean | undefined = undefined,
  transport extends ShredsWebSocketTransport = ShredsWebSocketTransport,
>(
  client: Client<transport, chain>,
  parameters: WatchContractShredEventParameters<abi_, eventName_, strict>,
): WatchContractShredEventReturnType {
  const {
    abi,
    address,
    args,
    eventName,
    onError,
    onLogs,
    strict: strict_,
  } = parameters

  const subscribeShredContractEvent = () => {
    let active = true
    let unsubscribe = () => {
      active = false
    }

    ;(async () => {
      try {
        const transport = client.transport

        const topics: LogTopic[] = eventName
          ? encodeEventTopics({
              abi,
              eventName,
              args,
            } as EncodeEventTopicsParameters)
          : []

        const { unsubscribe: unsubscribe_ } = await transport.riseSubscribe({
          params: ['logs', { address, topics }],
          onData(data: any) {
            if (!active) return
            const log = data.result
            try {
              const { eventName, args } = decodeEventLog({
                abi,
                data: log.data,
                topics: log.topics as any,
                strict: strict_,
              })
              const formatted = formatLog(log, {
                args,
                eventName: eventName as string,
              })
              onLogs([formatted] as any)
            } catch (error) {
              let eventName: string | undefined
              let isUnnamed: boolean | undefined
              if (
                error instanceof DecodeLogDataMismatch ||
                error instanceof DecodeLogTopicsMismatch
              ) {
                // If strict mode is on, and log data/topics do not match event definition, skip.
                if (strict_) return
                eventName = error.abiItem.name
                isUnnamed = error.abiItem.inputs?.some(
                  (x) => !('name' in x) || !x.name,
                )
              }

              // Set args to empty if there is an error decoding (e.g. indexed/non-indexed params mismatch).
              const formatted = formatLog(log, {
                args: isUnnamed ? [] : {},
                eventName,
              })
              onLogs([formatted] as any)
            }
          },
          onError(error: Error) {
            onError?.(error)
          },
        })
        unsubscribe = unsubscribe_
        if (!active) unsubscribe()
      } catch (error) {
        onError?.(error as Error)
      }
    })()
    return () => unsubscribe()
  }
  return subscribeShredContractEvent()
}
