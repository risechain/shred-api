import { formatShred } from '../../utils/formatters/shred'
import type { RpcShred, Shred } from '../../types/shred'
import type { Chain, Client, Transport } from 'viem'

/**
 * Parameters for {@link watchShreds}.
 */
export interface WatchShredsParameters {
  /** The callback to call when a new shred is received. */
  onShred: (shred: Shred) => void
  /** The callback to call when an error occurred when trying to get for a new shred. */
  onError?: ((error: Error) => void) | undefined
}

export type WatchShredsReturnType = () => void

/**
 * Watches for new shreds on the RISE network.
 *
 * @param client - Client to use.
 * @param parameters - {@link WatchShredsParameters}
 * @returns A function that can be used to unsubscribe from the shred.
 */
export function watchShreds<
  chain extends Chain | undefined,
  transport extends Transport = Transport,
>(
  client: Client<transport, chain>,
  { onShred, onError }: WatchShredsParameters,
): () => void {
  const transport_ = (() => {
    if (client.transport.type === 'webSocket') return client.transport

    const wsTransport = client.transport?.transports.find(
      (transport: ReturnType<Transport>) =>
        transport.config.type === 'webSocket',
    )

    if (!wsTransport) throw new Error('A websocket transport is required')

    return wsTransport.value
  })()

  const subscribeShreds = () => {
    let active = true
    let unsubscribe = () => {
      active = false
    }
    ;(async () => {
      try {
        const { unsubscribe: unsubscribe_ } = await transport_.subscribe({
          params: ['shreds'],
          onData: async (data: any) => {
            if (!active) return

            const shred: RpcShred = data.result

            onShred(await formatShred(shred, client.chain!.id))
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
  return subscribeShreds()
}
