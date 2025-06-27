import { describe, expect, it, vi } from 'vitest'
import { createPublicShredClient, shredsWebSocket } from '../../src/viem'
import { riseTestnet } from 'viem/chains'

describe('Backward Compatibility', () => {
  it('should create client without any configuration (like old code)', () => {
    // This is how users would have created clients before our changes
    const client = createPublicShredClient({
      transport: shredsWebSocket('ws://localhost:8545'),
    })

    // Client should be created successfully
    expect(client).toBeDefined()
    expect(client.watchShreds).toBeDefined()
    expect(client.watchShredEvent).toBeDefined()
    expect(client.watchContractShredEvent).toBeDefined()
  })

  it('should create client with chain config (common pattern)', () => {
    // Another common pattern
    const client = createPublicShredClient({
      chain: riseTestnet,
      transport: shredsWebSocket('ws://localhost:8545'),
    })

    expect(client).toBeDefined()
    expect(client.chain).toBe(riseTestnet)
  })

  it('new connection methods should be available but not required', () => {
    const client = createPublicShredClient({
      transport: shredsWebSocket('ws://localhost:8545'),
    })

    // New methods exist
    expect(client.getConnectionStatus).toBeDefined()
    expect(client.getConnectionStats).toBeDefined()
    expect(client.isConnected).toBeDefined()
    expect(client.onConnectionChange).toBeDefined()
    expect(client.waitForConnection).toBeDefined()

    // But they're not required - old code still works
    expect(typeof client.getConnectionStatus).toBe('function')
  })

  it('should handle missing connection manager gracefully', () => {
    const client = createPublicShredClient({
      transport: shredsWebSocket('ws://localhost:8545'),
    })

    // Even if connection manager isn't ready, methods should return safe defaults
    expect(client.getConnectionStatus()).toBe('disconnected')
    expect(client.isConnected()).toBe(false)
    expect(client.getConnectionStats()).toEqual({
      status: 'disconnected',
      reconnectAttempts: 0,
      totalConnections: 0,
      totalDisconnections: 0,
    })
  })
})