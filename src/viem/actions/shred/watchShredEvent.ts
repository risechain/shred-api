import {
  decodeEventLog,
  DecodeLogDataMismatch,
  DecodeLogTopicsMismatch,
  encodeEventTopics,
  formatLog,
  type AbiEvent,
  type Address,
  type Chain,
  type Client,
  type EncodeEventTopicsParameters,
  type LogTopic,
  type MaybeAbiEventName,
  type MaybeExtractEventArgsFromAbi,
} from 'viem'
import type { ShredsWebSocketTransport } from '../../clients/transports/shredsWebSocket'
import type { ShredLog } from '../../types/log'

export type WatchShredEventOnLogsParameter<
  abiEvent extends AbiEvent | undefined = undefined,
  abiEvents extends
    | readonly AbiEvent[]
    | readonly unknown[]
    | undefined = abiEvent extends AbiEvent ? [abiEvent] : undefined,
  strict extends boolean | undefined = undefined,
  eventName extends string | undefined = MaybeAbiEventName<abiEvent>,
> = ShredLog<bigint, number, abiEvent, strict, abiEvents, eventName>[]

export type WatchShredEventOnLogsFn<
  abiEvent extends AbiEvent | undefined = undefined,
  abiEvents extends
    | readonly AbiEvent[]
    | readonly unknown[]
    | undefined = abiEvent extends AbiEvent ? [abiEvent] : undefined,
  strict extends boolean | undefined = undefined,
  //
  _eventName extends string | undefined = MaybeAbiEventName<abiEvent>,
> = (
  logs: WatchShredEventOnLogsParameter<abiEvent, abiEvents, strict, _eventName>,
) => void

export type WatchShredEventParameters<
  abiEvent extends AbiEvent | undefined = undefined,
  abiEvents extends
    | readonly AbiEvent[]
    | readonly unknown[]
    | undefined = abiEvent extends AbiEvent ? [abiEvent] : undefined,
  strict extends boolean | undefined = undefined,
  //
  _eventName extends string | undefined = MaybeAbiEventName<abiEvent>,
> = {
  /** The address of the contract. */
  address?: Address | Address[] | undefined
  /** The callback to call when an error occurred when trying to get for a new block. */
  onError?: ((error: Error) => void) | undefined
  /** The callback to call when new event logs are received. */
  onLogs: WatchShredEventOnLogsFn<abiEvent, abiEvents, strict, _eventName>
} & (
  | {
      event: abiEvent
      events?: undefined
      args?: MaybeExtractEventArgsFromAbi<abiEvents, _eventName> | undefined
      /**
       * Whether or not the logs must match the indexed/non-indexed arguments on `event`.
       * @default false
       */
      strict?: strict | undefined
    }
  | {
      event?: undefined
      events?: abiEvents | undefined
      args?: undefined
      /**
       * Whether or not the logs must match the indexed/non-indexed arguments on `event`.
       * @default false
       */
      strict?: strict | undefined
    }
  | {
      event?: undefined
      events?: undefined
      args?: undefined
      strict?: undefined
    }
)

export type WatchShredEventReturnType = () => void

export function watchShredEvent<
  chain extends Chain | undefined,
  const abiEvent extends AbiEvent | undefined = undefined,
  const abiEvents extends
    | readonly AbiEvent[]
    | readonly unknown[]
    | undefined = abiEvent extends AbiEvent ? [abiEvent] : undefined,
  strict extends boolean | undefined = undefined,
  transport extends ShredsWebSocketTransport = ShredsWebSocketTransport,
>(
  client: Client<transport, chain>,
  {
    address,
    args,
    event,
    events,
    onError,
    onLogs,
    strict: strict_,
  }: WatchShredEventParameters<abiEvent, abiEvents, strict>,
): WatchShredEventReturnType {
  const isStrict = strict_ ?? false

  const subscribeShredEvents = () => {
    let active = true
    let unsubscribe = () => {
      active = false
    }

    ;(async () => {
      try {
        const events_ = events ?? (event ? [event] : undefined)
        let topics: LogTopic[] = []
        if (events_) {
          const encoded = (events_ as AbiEvent[]).flatMap((event) =>
            encodeEventTopics({
              abi: [event],
              eventName: (event as AbiEvent).name,
              args,
            } as EncodeEventTopicsParameters),
          )
          // TODO: Clean up type casting
          topics = [encoded as LogTopic]
          if (event) topics = topics[0] as LogTopic[]
        }

        const { unsubscribe: unsubscribe_ } =
          await client.transport.riseSubscribe({
            params: ['logs', { address, topics }],
            onData(data: any) {
              if (!active) return
              const log = data.result
              try {
                const { eventName, args } = decodeEventLog({
                  abi: events_ ?? [],
                  data: log.data,
                  topics: log.topics,
                  strict: isStrict,
                })
                const formatted = formatLog(log, { args, eventName })
                onLogs([formatted] as any)
              } catch (error) {
                let eventName: string | undefined
                let isUnnamed: boolean | undefined
                if (
                  error instanceof DecodeLogDataMismatch ||
                  error instanceof DecodeLogTopicsMismatch
                ) {
                  // If strict mode is on, and log data/topics do not match event definition, skip.
                  if (isStrict) return
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
            onError: (error) => {
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

  return subscribeShredEvents()
}
