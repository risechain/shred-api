import { SocketClosedError, WebSocketRequestError } from 'viem'
import type { RpcRequest } from '../../types/rpc'

import {
  getSocketRpcClient,
  type GetSocketRpcClientParameters,
  type Socket,
  type SocketRpcClient,
} from './socket'
import type { MessageEvent } from 'isows'

export type GetWebSocketRpcClientOptions = Pick<
  GetSocketRpcClientParameters,
  'keepAlive' | 'reconnect'
>

export function getWebSocketRpcClient(
  url: string,
  options: GetWebSocketRpcClientOptions | undefined = {},
): Promise<SocketRpcClient<WebSocket>> {
  const { keepAlive, reconnect } = options

  return getSocketRpcClient({
    async getSocket({ onClose, onError, onOpen, onResponse }) {
      const WebSocket = await import('isows').then((module) => module.WebSocket)
      const socket = new WebSocket(url)

      function onClose_() {
        socket.removeEventListener('close', onClose_)
        socket.removeEventListener('message', onMessage)
        socket.removeEventListener('error', onError)
        socket.removeEventListener('open', onOpen)
        onClose()
      }
      function onMessage({ data }: MessageEvent) {
        try {
          const _data = JSON.parse(data)
          onResponse(_data)
        } catch (error) {
          onError(error as Error)
        }
      }

      // Setup event listeners for RPC & subscription responses.
      socket.addEventListener('close', onClose_)
      socket.addEventListener('message', onMessage)
      socket.addEventListener('error', onError)
      socket.addEventListener('open', onOpen)

      // Wait for the socket to open.
      if (socket.readyState === WebSocket.CONNECTING) {
        await new Promise((resolve, reject) => {
          if (!socket) return
          socket.addEventListener('open', resolve)
          socket.addEventListener('error', (error) => {
            reject(
              new WebSocketRequestError({
                url: socket.url,
                cause: error as unknown as Error,
              }),
            )
          })
        })
      }

      const { close: close_ } = socket

      return Object.assign(socket, {
        close() {
          close_.bind(socket)()
          onClose_()
        },
        ping() {
          try {
            if (
              socket.readyState === socket.CLOSED ||
              socket.readyState === socket.CLOSING
            )
              throw new WebSocketRequestError({
                url: socket.url,
                cause: new SocketClosedError({ url: socket.url }),
              })

            const body: RpcRequest = {
              jsonrpc: '2.0',
              method: 'net_version',
              params: [],
            }
            socket.send(JSON.stringify(body))
          } catch (error) {
            onError(error as Error)
          }
        },
        request({ body }) {
          if (
            socket.readyState === socket.CLOSED ||
            socket.readyState === socket.CLOSING
          )
            throw new WebSocketRequestError({
              body,
              url: socket.url,
              cause: new SocketClosedError({ url: socket.url }),
            })

          return socket.send(JSON.stringify(body))
        },
      } as Socket<WebSocket>)
    },
    keepAlive,
    reconnect,
    url,
  })
}
