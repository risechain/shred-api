import {
  UrlRequiredError,
  webSocket,
  type Hash,
  type Transport,
  type WebSocketTransport,
  type WebSocketTransportConfig,
} from 'viem'
import type { ShredsRpcResponse } from '../../types/rpc'
import { getWebSocketRpcClient } from 'viem/utils'

type ShredsWebSocketTransportSubscribeParameters = {
  onData: (data: ShredsRpcResponse) => void
  onError?: ((error: any) => void) | undefined
}

type ShredsWebSocketTransportSubscribeReturnType = {
  subscriptionId: Hash
  unsubscribe: () => Promise<ShredsRpcResponse<boolean>>
}

type ShredsWebSocketTransportSubscribe = {
  riseSubscribe(
    args: ShredsWebSocketTransportSubscribeParameters,
  ): Promise<ShredsWebSocketTransportSubscribeReturnType>
}

export type ShredsWebSocketTransport =
  WebSocketTransport extends Transport<infer type, infer rpcAttributes>
    ? Transport<
        type,
        rpcAttributes & {
          riseSubscribe: ShredsWebSocketTransportSubscribe['riseSubscribe']
        }
      >
    : never

export function shredsWebSocket(
  url?: string,
  config: WebSocketTransportConfig = {},
): ShredsWebSocketTransport {
  const { keepAlive, reconnect } = config
  const ws = webSocket(url, config)
  return (params) => {
    const { chain } = params
    const ws_ = ws(params)
    const url_ = url || chain?.rpcUrls.default.webSocket?.[0]
    const wsRpcClientOpts = { keepAlive, reconnect }
    if (!url_) throw new UrlRequiredError()

    return {
      config: ws_.config,
      request: ws_.request,
      value: ws_.value
        ? {
            getSocket: ws_.value.getSocket,
            getRpcClient: ws_.value.getRpcClient,
            subscribe: ws_.value.subscribe,
            riseSubscribe: async ({
              onData,
              onError,
            }: ShredsWebSocketTransportSubscribeParameters): Promise<ShredsWebSocketTransportSubscribeReturnType> => {
              // TODO: create a custom implementation of webSocketRpcClient for rise_subscribe
              const rpcClient = await getWebSocketRpcClient(
                url_,
                wsRpcClientOpts,
              )
            },
          }
        : undefined,
    }
  }
}
