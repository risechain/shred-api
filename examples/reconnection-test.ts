#!/usr/bin/env bun
/**
 * Live test for WebSocket reconnection with exponential backoff
 * 
 * Usage:
 * 1. Start a local WebSocket server (e.g., using Anvil or a test server)
 * 2. Run: bun examples/reconnection-test.ts
 * 3. Stop/restart the WebSocket server to observe reconnection behavior
 */

import { createPublicShredClient, shredsWebSocket } from '../src/viem'
import { riseTestnet } from 'viem/chains'

// Configuration
const WS_URL = process.env.WS_URL || 'ws://localhost:8545'
const RECONNECT_ATTEMPTS = 5
const BASE_DELAY = 2000 // 2 seconds

console.log('WebSocket Reconnection Test')
console.log(`Connecting to: ${WS_URL}`)
console.log(`Max reconnect attempts: ${RECONNECT_ATTEMPTS}`)
console.log(`Base delay: ${BASE_DELAY}ms`)
console.log('---')

// Track connection events
let connectionCount = 0
let reconnectAttempt = 0
const startTime = Date.now()

// Create client with reconnection settings
const client = createPublicShredClient({
  chain: riseTestnet,
  transport: shredsWebSocket(WS_URL, {
    reconnect: {
      attempts: RECONNECT_ATTEMPTS,
      delay: BASE_DELAY,
    },
    keepAlive: {
      interval: 10000, // 10 seconds
    },
  }),
})

// Helper to format elapsed time
const getElapsedTime = () => {
  const elapsed = Date.now() - startTime
  return `[${(elapsed / 1000).toFixed(2)}s]`
}

// Monitor connection by attempting to watch shreds
const monitorConnection = async () => {
  try {
    console.log(`${getElapsedTime()} 🔌 Attempting to establish connection...`)

    const unsubscribe = client.watchShreds({
      onShred: (shred) => {
        if (connectionCount === 0) {
          connectionCount++
          console.log(`${getElapsedTime()} ✅ Connected successfully!`)
          console.log(`${getElapsedTime()} 📦 Receiving shreds...`)
        }
        // Log first few shreds to confirm connection
        if (connectionCount < 5) {
          console.log(`${getElapsedTime()} 📦 Shred #${shred.index}: ${shred.hash}`)
        }
      },
      onError: (error) => {
        console.error(`${getElapsedTime()} ❌ Error:`, error.message)

        // Track reconnection attempts
        if (error.message.includes('closed') || error.message.includes('failed')) {
          reconnectAttempt++
          const expectedDelay = Math.min(BASE_DELAY * Math.pow(2, reconnectAttempt - 1), 30000)
          console.log(`${getElapsedTime()} 🔄 Reconnection attempt ${reconnectAttempt}/${RECONNECT_ATTEMPTS}`)
          console.log(`${getElapsedTime()} ⏳ Expected backoff delay: ${expectedDelay}ms`)
        }
      },
    })

    // Keep the script running
    console.log(`${getElapsedTime()} 👀 Monitoring connection...`)
    console.log('💡 TIP: Stop/restart your WebSocket server to test reconnection')
    console.log('📝 Press Ctrl+C to exit\n')

    // Prevent script from exiting
    await new Promise(() => { })
  } catch (error) {
    console.error(`${getElapsedTime()} 💥 Fatal error:`, error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n${getElapsedTime()} 👋 Shutting down...`)
  process.exit(0)
})

// Start monitoring
monitorConnection()