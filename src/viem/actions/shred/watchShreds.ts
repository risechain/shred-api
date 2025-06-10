import { type Chain, type Client } from 'viem'
import type { ShredsWebSocketTransport } from '../../clients/transports/shredsWebSocket'

export interface WatchShredsParameters {
  onShred: () => void
  onError?: ((error: Error) => void) | undefined
}

export function watchShreds<
  chain extends Chain | undefined,
  transport extends ShredsWebSocketTransport,
>(
  client: Client<transport, chain>,
  parameters: WatchShredsParameters,
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
          onData: (data) => {
            if (!active) return
          },
          onError: (error) => {
            parameters.onError?.(error)
          },
        })
      unsubscribe = unsubscribe_
      if (!active) unsubscribe()
    })()
    return () => unsubscribe()
  }
  return subscribeShreds()
}
