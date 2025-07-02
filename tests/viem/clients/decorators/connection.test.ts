import { beforeEach, describe, expect, it } from 'vitest'
import { ConnectionStateManager } from '../../../../src/viem/utils/connection/manager'
import type { ConnectionStatus } from '../../../../src/viem/types/connection'

describe('Connection Status Tracking', () => {
  let manager: ConnectionStateManager

  beforeEach(() => {
    manager = new ConnectionStateManager()
  })

  describe('ConnectionStateManager', () => {
    it('should start with disconnected status', () => {
      expect(manager.getStatus()).toBe('disconnected')
      expect(manager.getStats()).toEqual({
        status: 'disconnected',
        reconnectAttempts: 0,
        totalConnections: 0,
        totalDisconnections: 0,
      })
    })

    it('should update status and emit events', () => {
      const statusChanges: ConnectionStatus[] = []
      manager.on('statusChange', (status) => statusChanges.push(status))

      manager.updateStatus('connecting')
      manager.updateStatus('connected')
      manager.updateStatus('disconnected')
      manager.updateStatus('error', new Error('test error'))

      expect(statusChanges).toEqual([
        'connecting',
        'connected',
        'disconnected',
        'error',
      ])
    })

    it('should track connection timestamps', () => {
      const now = Date.now()

      manager.updateStatus('connected')
      const stats1 = manager.getStats()
      expect(stats1.connectedAt).toBeGreaterThanOrEqual(now)
      expect(stats1.totalConnections).toBe(1)

      manager.updateStatus('disconnected')
      const stats2 = manager.getStats()
      expect(stats2.disconnectedAt).toBeGreaterThanOrEqual(stats1.connectedAt!)
      expect(stats2.totalDisconnections).toBe(1)
    })

    it('should track reconnection attempts', () => {
      manager.incrementReconnectAttempts()
      expect(manager.getStats().reconnectAttempts).toBe(1)

      manager.incrementReconnectAttempts()
      expect(manager.getStats().reconnectAttempts).toBe(2)

      manager.updateStatus('connected')
      expect(manager.getStats().reconnectAttempts).toBe(0)
    })

    it('should reset reconnect attempts on successful connection', () => {
      manager.incrementReconnectAttempts()
      manager.incrementReconnectAttempts()
      expect(manager.getStats().reconnectAttempts).toBe(2)

      manager.resetReconnectAttempts()
      expect(manager.getStats().reconnectAttempts).toBe(0)
    })

    it('should store last error', () => {
      const error = new Error('Connection failed')
      manager.updateStatus('error', error)

      const stats = manager.getStats()
      expect(stats.status).toBe('error')
      expect(stats.lastError).toBe(error)

      // Error should be cleared on successful connection
      manager.updateStatus('connected')
      expect(manager.getStats().lastError).toBeUndefined()
    })

    it('should not emit duplicate status changes', () => {
      const statusChanges: ConnectionStatus[] = []
      manager.on('statusChange', (status) => statusChanges.push(status))

      manager.updateStatus('connecting')
      manager.updateStatus('connecting') // duplicate
      manager.updateStatus('connected')
      manager.updateStatus('connected') // duplicate

      expect(statusChanges).toEqual(['connecting', 'connected'])
    })

    it('should track total connections and disconnections correctly', () => {
      // First connection cycle
      manager.updateStatus('connecting')
      manager.updateStatus('connected')
      manager.updateStatus('disconnected')

      expect(manager.getStats().totalConnections).toBe(1)
      expect(manager.getStats().totalDisconnections).toBe(1)

      // Second connection cycle
      manager.updateStatus('connecting')
      manager.updateStatus('connected')
      manager.updateStatus('disconnected')

      expect(manager.getStats().totalConnections).toBe(2)
      expect(manager.getStats().totalDisconnections).toBe(2)

      // Error without prior connection shouldn't increment disconnections
      manager.updateStatus('error')
      expect(manager.getStats().totalDisconnections).toBe(2)
    })
  })
})
