#!/usr/bin/env bun
/**
 * Request queue management example
 * 
 * This example demonstrates how to:
 * 1. Queue requests when connection is unavailable
 * 2. Use priority levels for request ordering
 * 3. Handle retries automatically
 * 4. Monitor queue statistics
 * 
 * Usage:
 * 1. Start a local WebSocket server (that you can stop/start)
 * 2. Run: bun examples/request-queue.ts
 */

import { createPublicShredClient, shredsWebSocket } from '../src/viem'
import { riseTestnet } from 'viem/chains'
import { parseAbi } from 'viem'

// Configuration
const WS_URL = process.env.WS_URL || 'ws://localhost:8545'

console.log('🚀 Request Queue Management Example')
console.log(`📡 Connecting to: ${WS_URL}`)
console.log('---\n')

async function main() {
  // Create client with queue support
  const client = createPublicShredClient({
    chain: riseTestnet,
    transport: shredsWebSocket(WS_URL, {
      reconnect: {
        enabled: true,
        maxAttempts: 10,
        delay: 2000
      }
    }),
  })

  console.log('📊 Queue features available:')
  console.log('   - queueRequest: Queue requests with priority')
  console.log('   - getQueueStats: View queue statistics')
  console.log('   - pauseQueue/resumeQueue: Control processing')
  console.log('   - clearQueue: Clear all pending requests\n')

  // Monitor connection status
  client.onConnectionChange((status, error) => {
    console.log(`\n🔌 Connection status: ${status}`)
    if (error) console.error('   Error:', error.message)
    
    // Show queue stats on disconnect
    if (status === 'disconnected') {
      const stats = client.getQueueStats()
      console.log(`📊 Queue stats: ${stats.queueSize} pending, ${stats.processing} processing`)
    }
  })

  // Example 1: Queue some requests
  console.log('\n📝 Queuing requests with different priorities...')
  
  // High priority request
  client.queueRequest({
    method: 'eth_blockNumber',
    params: [],
    priority: 'high',
    onSuccess: (result) => {
      console.log('✅ High priority request completed:', result)
    },
    onError: (error) => {
      console.error('❌ High priority request failed:', error.message)
    }
  })

  // Normal priority requests
  for (let i = 0; i < 3; i++) {
    client.queueRequest({
      method: 'eth_getBalance',
      params: [`0x${i.toString(16).padStart(40, '0')}`, 'latest'],
      priority: 'normal',
      onSuccess: (result) => {
        console.log(`✅ Normal request ${i} completed:`, result)
      }
    })
  }

  // Low priority request
  client.queueRequest({
    method: 'eth_gasPrice',
    params: [],
    priority: 'low',
    onSuccess: (result) => {
      console.log('✅ Low priority request completed:', result)
    }
  })

  // Show initial stats
  let stats = client.getQueueStats()
  console.log('\n📊 Initial queue statistics:')
  console.log(`   Queue size: ${stats.queueSize}`)
  console.log(`   Processing: ${stats.processing}`)
  console.log(`   Processed: ${stats.processed}`)
  console.log(`   Failed: ${stats.failed}`)

  // Example 2: Demonstrate pause/resume
  console.log('\n⏸️  Pausing queue for 3 seconds...')
  client.pauseQueue()
  
  // Add more requests while paused
  const pausedRequest = client.queueRequest({
    method: 'eth_chainId',
    params: [],
    priority: 'high',
    onSuccess: () => {
      console.log('✅ Request added while paused completed')
    }
  })

  setTimeout(() => {
    console.log('▶️  Resuming queue...')
    client.resumeQueue()
    
    // Check stats after resume
    setTimeout(() => {
      stats = client.getQueueStats()
      console.log('\n📊 Queue statistics after processing:')
      console.log(`   Processed: ${stats.processed}`)
      console.log(`   Failed: ${stats.failed}`)
      console.log(`   Avg processing time: ${stats.avgProcessingTime.toFixed(2)}ms`)
      if (stats.lastProcessedAt) {
        console.log(`   Last processed: ${new Date(stats.lastProcessedAt).toLocaleTimeString()}`)
      }
    }, 2000)
  }, 3000)

  // Example 3: Test disconnection handling
  console.log('\n🔌 To test disconnection handling:')
  console.log('   1. Stop your WebSocket server')
  console.log('   2. Requests will be queued automatically')
  console.log('   3. Start the server again')
  console.log('   4. Queued requests will be processed\n')

  // Interactive commands
  console.log('📝 Interactive commands:')
  console.log('   q <method> <params> - Queue a request (e.g., q eth_blockNumber [])')
  console.log('   s - Show queue statistics')
  console.log('   p - Pause/resume queue')
  console.log('   c - Clear queue')
  console.log('   l - List queued requests')
  console.log('   x - Exit\n')

  // Handle user input
  process.stdin.on('data', async (data) => {
    const input = data.toString().trim()
    const [command, ...args] = input.split(' ')

    switch (command) {
      case 'q':
        if (args.length >= 2) {
          const method = args[0]
          const params = JSON.parse(args.slice(1).join(' '))
          
          client.queueRequest({
            method,
            params,
            priority: 'normal',
            onSuccess: (result) => {
              console.log(`✅ ${method} completed:`, result)
            },
            onError: (error) => {
              console.error(`❌ ${method} failed:`, error.message)
            }
          }).then(() => {
            console.log(`📥 Queued ${method}`)
          }).catch((error) => {
            console.error(`❌ Failed to queue: ${error.message}`)
          })
        }
        break
        
      case 's':
        const stats = client.getQueueStats()
        console.log('\n📊 Current queue statistics:')
        console.log(`   Queue size: ${stats.queueSize}`)
        console.log(`   Processing: ${stats.processing}`)
        console.log(`   Processed: ${stats.processed}`)
        console.log(`   Failed: ${stats.failed}`)
        console.log(`   Avg time: ${stats.avgProcessingTime.toFixed(2)}ms`)
        break
        
      case 'p':
        if (client.getRequestQueue().isPaused()) {
          client.resumeQueue()
          console.log('▶️  Queue resumed')
        } else {
          client.pauseQueue()
          console.log('⏸️  Queue paused')
        }
        break
        
      case 'c':
        client.clearQueue()
        console.log('🗑️  Queue cleared')
        break
        
      case 'l':
        const requests = client.getQueuedRequests()
        console.log(`\n📋 Queued requests (${requests.length}):`)
        requests.forEach((req, i) => {
          console.log(`   ${i + 1}. [${req.priority}] ${req.method} - retry ${req.retryCount}/${req.maxRetries}`)
        })
        break
        
      case 'x':
        console.log('👋 Exiting...')
        process.exit(0)
        
      default:
        console.log('❓ Unknown command')
    }
  })

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...')
    const stats = client.getQueueStats()
    console.log(`📊 Final stats: ${stats.processed} processed, ${stats.failed} failed`)
    process.exit(0)
  })
}

// Run the example
main().catch(console.error)