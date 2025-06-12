import type { ShredsWebSocketTransport } from '../../clients/transports/shredsWebSocket'
import type { Chain, Client } from 'viem'
import type { RpcShred, Shred } from '../../types/shred'
import { formatShred } from '../../utils/formatters/shred'

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
  transport extends ShredsWebSocketTransport,
>(
  client: Client<transport, chain>,
  { onShred, onError }: WatchShredsParameters,
): () => void {
  const subscribeShreds = () => {
    let active = true
    let unsubscribe = () => {
      active = false
    }
    ;(async () => {
      const { unsubscribe: unsubscribe_ } =
        await client.transport.riseSubscribe({
          params: [],
          onData: (data: any) => {
            if (!active) return

            const shred: RpcShred = data.result

            onShred(formatShred(shred))
          },
          onError: (error) => {
            onError?.(error)
          },
        })
      unsubscribe = unsubscribe_
      if (!active) unsubscribe()
    })()
    return () => unsubscribe()
  }
  return subscribeShreds()
}
