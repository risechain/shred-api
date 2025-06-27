#!/usr/bin/env bun
/**
 * Simple test script for watching all shreds
 * Connects to RISE testnet and monitors all shred activity
 */

import { createPublicShredClient, shredsWebSocket } from '../src/viem'
import { riseTestnet } from 'viem/chains'

// Configuration
const WS_URL = 'wss://testnet.riselabs.xyz/ws'

console.log('🚀 Testing Shred Watching')
console.log(`📡 Connecting to: ${WS_URL}`)
console.log('---\n')

async function main() {
  // Create client
  const client = createPublicShredClient({
    chain: riseTestnet,
    transport: shredsWebSocket(WS_URL, {
      reconnect: {
        enabled: true,
        attempts: 5,
        delay: 2000
      }
    }),
  })

  // Monitor connection status
  const unsubscribeConnection = client.onConnectionChange((status, error) => {
    console.log(`🔌 Connection status: ${status}`)
    if (error) console.error('   Error:', error.message)
    
    // Show connection stats when connected
    if (status === 'connected') {
      const stats = client.getConnectionStats()
      console.log('📊 Connection stats:', {
        totalConnections: stats.totalConnections,
        reconnectAttempts: stats.reconnectAttempts,
        connectedAt: new Date(stats.connectedAt!).toLocaleTimeString()
      })
    }
  })

  // Wait for connection
  console.log('⏳ Waiting for connection...')
  await client.waitForConnection(10000)
  console.log('✅ Connected!\n')

  console.log('👀 Watching for shreds...')
  console.log('   (Press Ctrl+C to stop)\n')

  let shredCount = 0
  let lastShredTime = Date.now()

  // Watch for shreds
  const unsubscribeShreds = await client.watchShreds({
    onShred: (shred) => {
      shredCount++
      const timeSinceLast = Date.now() - lastShredTime
      lastShredTime = Date.now()

      console.log(`\n📦 Shred #${shredCount} received:`)
      console.log(`   Slot: ${shred.slot}`)
      console.log(`   Index: ${shred.index}`)
      console.log(`   Block Number: ${shred.blockNumber}`)
      console.log(`   Block Hash: ${shred.blockHash}`)
      console.log(`   Parent Hash: ${shred.parentHash}`)
      console.log(`   Transactions: ${shred.transactions?.length || 0}`)
      console.log(`   Timestamp: ${new Date(Number(shred.timestamp) * 1000).toLocaleTimeString()}`)
      console.log(`   Time since last: ${timeSinceLast}ms`)
      
      // Show first transaction if any
      if (shred.transactions && shred.transactions.length > 0) {
        console.log(`   First tx: ${shred.transactions[0].hash}`)
      }
    },
    onError: (error) => {
      console.error('❌ Shred subscription error:', error.message)
    }
  })

  // Show periodic stats
  const statsInterval = setInterval(() => {
    const connStats = client.getConnectionStats()
    const uptime = connStats.connectedAt 
      ? Math.round((Date.now() - connStats.connectedAt) / 1000) 
      : 0
      
    console.log(`\n📊 Stats - Shreds: ${shredCount}, Uptime: ${uptime}s, Status: ${connStats.status}`)
  }, 30000) // Every 30 seconds

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n👋 Shutting down...')
    
    clearInterval(statsInterval)
    unsubscribeShreds()
    unsubscribeConnection()
    
    const finalStats = client.getConnectionStats()
    console.log('\n📊 Final statistics:')
    console.log(`   Total shreds received: ${shredCount}`)
    console.log(`   Total connections: ${finalStats.totalConnections}`)
    console.log(`   Total disconnections: ${finalStats.totalDisconnections}`)
    
    process.exit(0)
  })
}

// Run the script
main().catch(error => {
  console.error('❌ Script error:', error)
  process.exit(1)
})