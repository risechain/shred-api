import {
  UrlRequiredError,
  webSocket,
  type Address,
  type Hash,
  type LogTopic,
  type Transport,
  type WebSocketTransport,
  type WebSocketTransportConfig,
} from 'viem'
import { getWebSocketRpcClient } from '../../utils/rpc/webSocket'
import type { ShredsRpcResponse } from '../../types/rpc'

type ShredsWebSocketTransportSubscribeParameters = {
  onData: (data: ShredsRpcResponse['params']) => void
  onError?: ((error: any) => void) | undefined
}

type ShredsWebSocketTransportSubscribeReturnType = {
  subscriptionId: Hash
  unsubscribe: () => Promise<ShredsRpcResponse<boolean>>
}

type ShredsWebSocketTransportSubscribe = {
  riseSubscribe: (
    args: ShredsWebSocketTransportSubscribeParameters &
      (
        | {
            params: []
          }
        | {
            params: [
              'logs',
              {
                address?: Address | Address[]
                topics?: LogTopic[]
              },
            ]
          }
      ),
  ) => Promise<ShredsWebSocketTransportSubscribeReturnType>
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

    const returnValue = {
      config: ws_.config,
      request: ws_.request,
      value: ws_.value
        ? {
            getSocket: ws_.value.getSocket,
            getRpcClient: () => getWebSocketRpcClient(url_, wsRpcClientOpts),
            subscribe: ws_.value.subscribe,
            async riseSubscribe({ params, onData, onError }) {
              const rpcClient = await getWebSocketRpcClient(
                url_,
                wsRpcClientOpts,
              )
              const { result: subscriptionId } = await new Promise<any>(
                (resolve, reject) =>
                  rpcClient.request({
                    body: {
                      method: 'rise_subscribe',
                      params,
                    },
                    onError(error) {
                      reject(error)
                      onError?.(error)
                      return
                    },
                    onResponse(response) {
                      if (response.error) {
                        reject(response.error)
                        onError?.(response.error)
                        return
                      }

                      if (typeof response.id === 'number') {
                        resolve(response)
                        return
                      }
                      if (response.method !== 'rise_subscription') return

                      onData(response.params)
                    },
                  }),
              )
              return {
                subscriptionId,
                unsubscribe() {
                  return new Promise<any>((resolve) =>
                    rpcClient.request({
                      body: {
                        method: 'rise_unsubscribe',
                        params: [subscriptionId],
                      },
                      onResponse: resolve,
                    }),
                  )
                },
              }
            },
          }
        : undefined,
    }
    return returnValue
  }
}
