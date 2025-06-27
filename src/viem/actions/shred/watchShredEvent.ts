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
  type FallbackTransport,
  type LogTopic,
  type MaybeAbiEventName,
  type MaybeExtractEventArgsFromAbi,
  type Transport,
} from 'viem'
import type { ShredsWebSocketTransport } from '../../clients/transports/shredsWebSocket'
import type { ShredLog } from '../../types/log'
import { getSubscriptionManager } from '../../utils/subscription/manager'
import type { ManagedSubscription } from '../../utils/subscription/types'

/**
 * The parameter for the `onLogs` callback in {@link watchShredEvent}.
 */
export type WatchShredEventOnLogsParameter<
  abiEvent extends AbiEvent | undefined = undefined,
  abiEvents extends
    | readonly AbiEvent[]
    | readonly unknown[]
    | undefined = abiEvent extends AbiEvent ? [abiEvent] : undefined,
  strict extends boolean | undefined = undefined,
  eventName extends string | undefined = MaybeAbiEventName<abiEvent>,
> = ShredLog<bigint, number, abiEvent, strict, abiEvents, eventName>[]

/**
 * The callback function for when new event logs are received in {@link watchShredEvent}.
 */
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

/**
 * Parameters for {@link watchShredEvent}.
 */
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
  /** Whether to create a managed subscription that supports dynamic updates. */
  managed?: boolean | undefined
  /** Whether to buffer events during subscription updates (only with managed: true). */
  buffered?: boolean | undefined
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

/**
 * Return type for {@link watchShredEvent}.
 */
export type WatchShredEventReturnType = (() => void) & {
  /** The managed subscription object, only present when managed: true */
  subscription?: ManagedSubscription | undefined
}

/**
 * Watches and returns emitted events that have been processed and confirmed as shreds
 * on the RISE network.
 *
 * @param client - Client to use.
 * @param parameters - {@link WatchShredEventParameters}
 * @returns A function that can be used to unsubscribe from the event. {@link WatchShredEventReturnType}
 */
export async function watchShredEvent<
  chain extends Chain | undefined,
  const abiEvent extends AbiEvent | undefined = undefined,
  const abiEvents extends
    | readonly AbiEvent[]
    | readonly unknown[]
    | undefined = abiEvent extends AbiEvent ? [abiEvent] : undefined,
  strict extends boolean | undefined = undefined,
  transport extends
    | ShredsWebSocketTransport
    | FallbackTransport<
        readonly [ShredsWebSocketTransport, ...Transport[]]
      > = ShredsWebSocketTransport,
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
    managed,
    buffered,
  }: WatchShredEventParameters<abiEvent, abiEvents, strict>,
): Promise<WatchShredEventReturnType> {
  const transport_ = (() => {
    if (client.transport.type === 'webSocket') return client.transport

    const wsTransport = (
      client.transport as ReturnType<
        FallbackTransport<readonly [ShredsWebSocketTransport, ...Transport[]]>
      >['value']
    )?.transports.find(
      (transport: ReturnType<Transport>) =>
        transport.config.type === 'webSocket',
    )

    if (!wsTransport) throw new Error('A shredWebSocket transport is required')

    return wsTransport.value
  })() as NonNullable<ReturnType<ShredsWebSocketTransport>['value']>

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

        const { unsubscribe: unsubscribe_ } = await transport_.riseSubscribe({
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
          onError: (error: Error) => {
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

  // Handle managed subscriptions
  if (managed) {
    const manager = getSubscriptionManager()
    const subscription = await manager.createManagedSubscription(client, {
      address,
      args,
      event,
      events,
      onError,
      onLogs,
      strict: strict_,
      buffered,
    })
    
    // Return enhanced unsubscribe with subscription property
    const enhancedUnsubscribe = Object.assign(
      () => subscription.unsubscribe(),
      { subscription }
    ) as WatchShredEventReturnType
    
    return enhancedUnsubscribe
  }
  
  // Regular subscription (backward compatible)
  return subscribeShredEvents() as WatchShredEventReturnType
}
