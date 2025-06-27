#!/usr/bin/env bun
/**
 * Live example for connection status monitoring
 * 
 * Usage:
 * 1. Start a local WebSocket server (e.g., using Anvil or a test server)
 * 2. Run: bun examples/connection-monitoring.ts
 * 3. Stop/restart the WebSocket server to observe connection status changes
 */

import { createPublicShredClient, shredsWebSocket } from '../src/viem'
import { riseTestnet } from 'viem/chains'
import type { ConnectionStatus, ConnectionStats } from '../src/viem/types/connection'

// Configuration
const WS_URL = process.env.WS_URL || 'ws://localhost:8545'

console.log('🚀 Connection Status Monitoring Example')
console.log(`📡 Connecting to: ${WS_URL}`)
console.log('---')

// Create client with connection monitoring
const client = createPublicShredClient({
  chain: riseTestnet,
  transport: shredsWebSocket(WS_URL, {
    reconnect: {
      attempts: 5,
      delay: 2000,
    },
  }),
})

// Helper to format connection stats
const formatStats = (stats: ConnectionStats) => {
  const uptime = stats.connectedAt 
    ? `${((Date.now() - stats.connectedAt) / 1000).toFixed(1)}s`
    : 'N/A'
  
  return `
  Status: ${stats.status}
  Connected At: ${stats.connectedAt ? new Date(stats.connectedAt).toLocaleTimeString() : 'N/A'}
  Uptime: ${uptime}
  Reconnect Attempts: ${stats.reconnectAttempts}
  Total Connections: ${stats.totalConnections}
  Total Disconnections: ${stats.totalDisconnections}
  Last Error: ${stats.lastError?.message || 'None'}
  `
}

// Monitor connection status changes
console.log('📊 Setting up connection monitoring...')

// Wait a bit for the connection to initialize
setTimeout(() => {
  // Subscribe to connection changes
  const unsubscribe = client.onConnectionChange((status: ConnectionStatus) => {
    console.log(`\n🔄 Connection status changed to: ${status}`)
    
    // Get detailed stats
    const stats = client.getConnectionStats()
    console.log(formatStats(stats))
    
    // Additional status-specific logging
    switch (status) {
      case 'connected':
        console.log('✅ Successfully connected!')
        // Try to watch shreds to verify connection
        client.watchShreds({
          onShred: (shred) => {
            console.log(`📦 Received shred #${shred.index}`)
          },
          onError: (error) => {
            console.error('❌ Shred watch error:', error.message)
          },
        })
        break
      case 'disconnected':
        console.log('🔌 Disconnected from server')
        break
      case 'connecting':
        console.log('⏳ Attempting to connect...')
        break
      case 'error':
        console.log('❌ Connection error occurred')
        break
    }
  })

  // Initial status check
  console.log('\n📍 Initial connection status:')
  console.log(`Connected: ${client.isConnected()}`)
  console.log(`Status: ${client.getConnectionStatus()}`)
  console.log(formatStats(client.getConnectionStats()))

  // Periodic stats display
  const statsInterval = setInterval(() => {
    console.log('\n📈 Current connection stats:')
    console.log(formatStats(client.getConnectionStats()))
  }, 10000) // Every 10 seconds

  // Test waitForConnection
  console.log('\n⏳ Waiting for connection...')
  client.waitForConnection(30000)
    .then(() => {
      console.log('✅ Connection established via waitForConnection()')
    })
    .catch((error) => {
      console.error('❌ Connection timeout:', error.message)
    })

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...')
    unsubscribe()
    clearInterval(statsInterval)
    process.exit(0)
  })

  console.log('\n💡 TIP: Stop/restart your WebSocket server to test connection status changes')
  console.log('📝 Press Ctrl+C to exit\n')
}, 1000)

// Keep the script running
process.stdin.resume()