import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { connectionActions } from '../../../../src/viem/clients/decorators/connection'
import { ConnectionStateManager } from '../../../../src/viem/utils/connection/manager'
import type { ConnectionStatus } from '../../../../src/viem/types/connection'

describe('Connection Actions Decorator', () => {
  let mockClient: any
  let mockConnectionManager: ConnectionStateManager
  let mockRpcClient: any

  beforeEach(() => {
    // Create a real connection manager for testing
    mockConnectionManager = new ConnectionStateManager()

    // Mock RPC client with connection manager
    mockRpcClient = {
      connectionManager: mockConnectionManager,
    }

    // Mock client with transport that returns the RPC client
    mockClient = {
      transport: {
        value: {
          getRpcClient: vi.fn().mockResolvedValue(mockRpcClient),
        },
      },
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getConnectionStatus', () => {
    it('should return current connection status', async () => {
      const actions = connectionActions(mockClient)

      // Initially disconnected
      expect(actions.getConnectionStatus()).toBe('disconnected')

      // Wait for manager to be cached
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Update status
      mockConnectionManager.updateStatus('connected')
      expect(actions.getConnectionStatus()).toBe('connected')

      mockConnectionManager.updateStatus('error')
      expect(actions.getConnectionStatus()).toBe('error')
    })

    it('should return disconnected when no manager available', () => {
      const clientNoManager = {
        transport: {
          value: {
            getRpcClient: vi.fn().mockResolvedValue({}),
          },
        },
      }

      const actions = connectionActions(clientNoManager)
      expect(actions.getConnectionStatus()).toBe('disconnected')
    })
  })

  describe('getConnectionStats', () => {
    it('should return connection statistics', async () => {
      const actions = connectionActions(mockClient)

      // Wait for manager to be cached
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Update some stats
      mockConnectionManager.updateStatus('connected')
      mockConnectionManager.incrementReconnectAttempts()

      const stats = actions.getConnectionStats()
      expect(stats.status).toBe('connected')
      expect(stats.reconnectAttempts).toBe(1)
      expect(stats.totalConnections).toBe(1)
      expect(stats.connectedAt).toBeDefined()
    })

    it('should return default stats when no manager', () => {
      const clientNoManager = {
        transport: { value: {} },
      }

      const actions = connectionActions(clientNoManager)
      const stats = actions.getConnectionStats()

      expect(stats).toEqual({
        status: 'disconnected',
        reconnectAttempts: 0,
        totalConnections: 0,
        totalDisconnections: 0,
      })
    })
  })

  describe('isConnected', () => {
    it('should return true when connected', async () => {
      const actions = connectionActions(mockClient)

      // Wait for manager to be cached
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(actions.isConnected()).toBe(false)

      mockConnectionManager.updateStatus('connected')
      expect(actions.isConnected()).toBe(true)

      mockConnectionManager.updateStatus('disconnected')
      expect(actions.isConnected()).toBe(false)
    })
  })

  describe('onConnectionChange', () => {
    it('should subscribe to connection status changes', async () => {
      const actions = connectionActions(mockClient)
      const statusChanges: ConnectionStatus[] = []

      // Subscribe to changes
      const unsubscribe = actions.onConnectionChange((status) => {
        statusChanges.push(status)
      })

      // Wait for async subscription
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Trigger status changes
      mockConnectionManager.updateStatus('connecting')
      mockConnectionManager.updateStatus('connected')
      mockConnectionManager.updateStatus('disconnected')

      expect(statusChanges).toEqual(['connecting', 'connected', 'disconnected'])

      // Test unsubscribe
      unsubscribe()
      mockConnectionManager.updateStatus('error')

      // Should not receive the error status
      expect(statusChanges).toEqual(['connecting', 'connected', 'disconnected'])
    })

    it('should handle missing connection manager gracefully', () => {
      const clientNoManager = {
        transport: {
          value: {
            getRpcClient: vi.fn().mockResolvedValue({}),
          },
        },
      }

      const actions = connectionActions(clientNoManager)
      const unsubscribe = actions.onConnectionChange(() => {})

      // Should not throw
      expect(unsubscribe).toBeDefined()
      unsubscribe()
    })
  })

  describe('waitForConnection', () => {
    it('should resolve immediately when already connected', async () => {
      const actions = connectionActions(mockClient)

      // Wait for manager to be cached
      await new Promise((resolve) => setTimeout(resolve, 10))

      mockConnectionManager.updateStatus('connected')

      const start = Date.now()
      await actions.waitForConnection()
      const duration = Date.now() - start

      expect(duration).toBeLessThan(50) // Should be nearly instant
    })

    it('should wait for connection and resolve when connected', async () => {
      const actions = connectionActions(mockClient)

      // Wait for manager to be cached
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Start disconnected
      mockConnectionManager.updateStatus('disconnected')

      // Start waiting
      const waitPromise = actions.waitForConnection(1000)

      // Connect after 50ms
      setTimeout(() => {
        mockConnectionManager.updateStatus('connected')
      }, 50)

      await expect(waitPromise).resolves.toBeUndefined()
    })

    it('should timeout when connection not established', async () => {
      const actions = connectionActions(mockClient)

      // Wait for manager to be cached
      await new Promise((resolve) => setTimeout(resolve, 10))

      mockConnectionManager.updateStatus('disconnected')

      await expect(
        actions.waitForConnection(100), // 100ms timeout
      ).rejects.toThrow('Connection timeout')
    })

    it('should throw when no connection manager available', async () => {
      const clientNoManager = {
        transport: {
          value: {
            getRpcClient: vi.fn().mockResolvedValue({}),
          },
        },
      }

      const actions = connectionActions(clientNoManager)

      await expect(actions.waitForConnection()).rejects.toThrow(
        'No connection manager available',
      )
    })
  })

  describe('fallback transport handling', () => {
    it('should handle fallback transport with WebSocket as first transport', async () => {
      const fallbackClient = {
        transport: {
          value: {
            transports: [
              {
                value: {
                  getRpcClient: vi.fn().mockResolvedValue(mockRpcClient),
                },
              },
              // Other transports...
            ],
          },
        },
      }

      const actions = connectionActions(fallbackClient)

      // Wait for manager to be cached
      await new Promise((resolve) => setTimeout(resolve, 10))

      mockConnectionManager.updateStatus('connected')
      expect(actions.getConnectionStatus()).toBe('connected')
    })
  })

  describe('caching behavior', () => {
    it('should cache connection manager after first access', async () => {
      const getRpcClientSpy = vi.spyOn(
        mockClient.transport.value,
        'getRpcClient',
      )
      const actions = connectionActions(mockClient)

      // First call triggers async retrieval
      actions.getConnectionStatus()

      await new Promise((resolve) => setTimeout(resolve, 10))

      // These calls should use cache
      actions.getConnectionStatus()
      actions.getConnectionStats()
      actions.isConnected()

      // Should only be called once during initialization
      expect(getRpcClientSpy).toHaveBeenCalledTimes(1)
    })
  })
})
