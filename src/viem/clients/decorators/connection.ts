import type { ConnectionStats, ConnectionStatus } from '../../types/connection'
import type { Chain, Client, Transport } from 'viem'

export type ConnectionActions = {
  getConnectionStatus: () => ConnectionStatus
  getConnectionStats: () => ConnectionStats
  isConnected: () => boolean
  onConnectionChange: (
    callback: (status: ConnectionStatus) => void,
  ) => () => void // returns unsubscribe function
  waitForConnection: (timeoutMs?: number) => Promise<void>
}

export function connectionActions<
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
>(client: Client<TTransport, TChain>): ConnectionActions {
  // Cache the connection manager promise to avoid multiple async calls
  let managerPromise: Promise<any> | null = null
  let cachedManager: any = null

  // We need a more reliable way to get the connection manager
  // Let's store it on the transport value directly
  const getManager = async () => {
    const transport = client.transport as any

    // Direct WebSocket transport - methods are available directly on transport after viem processing
    if (transport?.getRpcClient) {
      const rpcClient = await transport.getRpcClient()
      return rpcClient?.connectionManager
    }

    // Legacy fallback for transport.value.getRpcClient (in case some transports still use this structure)
    if (transport?.value?.getRpcClient) {
      const rpcClient = await transport.value.getRpcClient()
      return rpcClient?.connectionManager
    }

    // Fallback transport with direct methods on first transport
    if (transport?.value?.transports?.[0]?.getRpcClient) {
      const rpcClient = await transport.value.transports[0].getRpcClient()
      return rpcClient?.connectionManager
    }

    // Fallback transport with legacy value structure
    if (transport?.value?.transports?.[0]?.value?.getRpcClient) {
      const rpcClient = await transport.value.transports[0].value.getRpcClient()
      return rpcClient?.connectionManager
    }

    return null
  }

  // Initialize the manager retrieval immediately
  const initializeManager = async () => {
    const manager = await getManager()
    cachedManager = manager
    return manager
  }

  // Start initialization immediately
  managerPromise = initializeManager()

  const getConnectionManager = () => {
    return cachedManager
  }

  return {
    getConnectionStatus: () => {
      const manager = getConnectionManager()
      return manager?.getStatus() ?? 'disconnected'
    },

    getConnectionStats: () => {
      const manager = getConnectionManager()
      return (
        manager?.getStats() ?? {
          status: 'disconnected',
          reconnectAttempts: 0,
          totalConnections: 0,
          totalDisconnections: 0,
        }
      )
    },

    isConnected: () => {
      const manager = getConnectionManager()
      return manager?.getStatus() === 'connected'
    },

    onConnectionChange: (callback) => {
      // Store the manager reference for unsubscribe
      let manager: any = null

      // Set up the subscription when manager is available
      managerPromise.then((m) => {
        if (!m) return
        manager = m
        manager.on('statusChange', callback)
      })

      // Return unsubscribe function that works immediately
      return () => {
        if (manager) {
          manager.off('statusChange', callback)
        }
      }
    },

    waitForConnection: async (timeoutMs = 30000) => {
      const manager = await managerPromise
      if (!manager) throw new Error('No connection manager available')

      if (manager.getStatus() === 'connected') return

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          unsubscribe()
          reject(new Error('Connection timeout'))
        }, timeoutMs)

        const checkStatus = (status: ConnectionStatus) => {
          if (status === 'connected') {
            clearTimeout(timeout)
            unsubscribe()
            resolve()
          }
        }

        manager.on('statusChange', checkStatus)
        const unsubscribe = () => manager.off('statusChange', checkStatus)

        // Check current status in case it changed before listener was added
        if (manager.getStatus() === 'connected') {
          clearTimeout(timeout)
          unsubscribe()
          resolve()
        }
      })
    },
  }
}
