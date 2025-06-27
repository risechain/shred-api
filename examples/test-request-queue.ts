#!/usr/bin/env bun
/**
 * Test script for request queue functionality
 * Demonstrates queuing, priority handling, and resilience
 */

import { createPublicShredClient, shredsWebSocket } from '../src/viem'
import { riseTestnet } from 'viem/chains'
import { formatEther } from 'viem'

// Configuration
const WS_URL = 'wss://testnet.riselabs.xyz/ws'

// Test addresses
const TEST_ADDRESSES = [
  '0x4200000000000000000000000000000000000006', // WETH
  '0x8a93d247134d91e0de6f96547cb0204e5be8e5d8', // USDC
  '0x0000000000000000000000000000000000000000', // Zero address
] as const

console.log('🚀 Testing Request Queue Functionality')
console.log(`📡 Connecting to: ${WS_URL}`)
console.log('---\n')

async function main() {
  // Create client
  const client = createPublicShredClient({
    chain: riseTestnet,
    transport: shredsWebSocket(WS_URL, {
      reconnect: {
        enabled: true,
        attempts: 10,
        delay: 2000
      }
    }),
  })

  // Monitor connection status
  client.onConnectionChange((status, error) => {
    console.log(`🔌 Connection status: ${status}`)
    if (error) console.error('   Error:', error.message)
    
    // Show queue stats on status change
    const queueStats = client.getQueueStats()
    if (queueStats.queueSize > 0 || queueStats.processing > 0) {
      console.log(`📊 Queue: ${queueStats.queueSize} pending, ${queueStats.processing} processing`)
    }
  })

  // Wait for connection
  console.log('⏳ Waiting for connection...')
  await client.waitForConnection(10000)
  console.log('✅ Connected!\n')

  // Test 1: Queue multiple requests with different priorities
  console.log('📝 Test 1: Queuing requests with different priorities...')
  
  // Queue low priority requests
  for (let i = 0; i < 3; i++) {
    client.queueRequest({
      method: 'eth_getBalance',
      params: [TEST_ADDRESSES[i], 'latest'],
      priority: 'low',
      onSuccess: (result) => {
        const balance = formatEther(result)
        console.log(`✅ [LOW] Balance of ${TEST_ADDRESSES[i].slice(0, 10)}...: ${balance} ETH`)
      },
      onError: (error) => {
        console.error(`❌ [LOW] Failed to get balance: ${error.message}`)
      }
    })
  }

  // Queue high priority request
  client.queueRequest({
    method: 'eth_blockNumber',
    params: [],
    priority: 'high',
    onSuccess: (result) => {
      console.log(`✅ [HIGH] Current block number: ${parseInt(result, 16)}`)
    },
    onError: (error) => {
      console.error(`❌ [HIGH] Failed to get block number: ${error.message}`)
    }
  })

  // Queue normal priority requests
  client.queueRequest({
    method: 'eth_chainId',
    params: [],
    priority: 'normal',
    onSuccess: (result) => {
      console.log(`✅ [NORMAL] Chain ID: ${parseInt(result, 16)}`)
    },
    onError: (error) => {
      console.error(`❌ [NORMAL] Failed to get chain ID: ${error.message}`)
    }
  })

  // Show initial queue stats
  let stats = client.getQueueStats()
  console.log('\n📊 Initial queue statistics:')
  console.log(`   Queue size: ${stats.queueSize}`)
  console.log(`   Processing: ${stats.processing}`)
  console.log(`   Processed: ${stats.processed}`)
  console.log(`   Failed: ${stats.failed}`)

  // Wait for initial requests to process
  await new Promise(resolve => setTimeout(resolve, 3000))

  // Test 2: Test pause/resume
  console.log('\n📝 Test 2: Testing pause/resume functionality...')
  
  // Pause the queue
  console.log('⏸️  Pausing queue...')
  client.pauseQueue()
  
  // Queue some requests while paused
  const pausedPromises = []
  for (let i = 0; i < 5; i++) {
    pausedPromises.push(
      client.queueRequest({
        method: 'eth_getBlockByNumber',
        params: [`0x${i.toString(16)}`, false],
        priority: 'normal',
        onSuccess: (result) => {
          console.log(`✅ Block ${i}: ${result?.hash?.slice(0, 10)}...`)
        },
        onError: (error) => {
          console.error(`❌ Failed to get block ${i}: ${error.message}`)
        }
      })
    )
  }

  stats = client.getQueueStats()
  console.log(`📊 Queue while paused: ${stats.queueSize} pending`)

  // Resume after 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000))
  console.log('▶️  Resuming queue...')
  client.resumeQueue()

  // Wait for paused requests to complete
  await Promise.allSettled(pausedPromises)

  // Test 3: Test high volume
  console.log('\n📝 Test 3: Testing high volume requests...')
  
  const volumePromises = []
  const startTime = Date.now()
  
  for (let i = 0; i < 20; i++) {
    volumePromises.push(
      client.queueRequest({
        method: 'net_version',
        params: [],
        priority: i % 3 === 0 ? 'high' : i % 2 === 0 ? 'normal' : 'low',
        onSuccess: () => {
          // Silent success
        },
        onError: (error) => {
          console.error(`❌ Request ${i} failed: ${error.message}`)
        }
      })
    )
  }

  // Monitor progress
  const progressInterval = setInterval(() => {
    const currentStats = client.getQueueStats()
    const progress = currentStats.processed / (currentStats.processed + currentStats.queueSize + currentStats.processing) * 100
    console.log(`⏳ Progress: ${progress.toFixed(1)}% (${currentStats.processed} processed, ${currentStats.queueSize} queued)`)
  }, 1000)

  // Wait for all requests to complete
  await Promise.allSettled(volumePromises)
  clearInterval(progressInterval)

  const duration = Date.now() - startTime
  console.log(`✅ Processed 20 requests in ${duration}ms`)

  // Final statistics
  stats = client.getQueueStats()
  console.log('\n📊 Final queue statistics:')
  console.log(`   Total processed: ${stats.processed}`)
  console.log(`   Total failed: ${stats.failed}`)
  console.log(`   Success rate: ${(stats.processed / (stats.processed + stats.failed) * 100).toFixed(2)}%`)
  console.log(`   Avg processing time: ${stats.avgProcessingTime.toFixed(2)}ms`)
  if (stats.lastProcessedAt) {
    console.log(`   Last processed: ${new Date(stats.lastProcessedAt).toLocaleTimeString()}`)
  }

  // Test 4: Test disconnection handling (optional - requires manually stopping/starting server)
  console.log('\n📝 Test 4: Disconnection handling')
  console.log('   To test: Stop your WebSocket server, queue requests, then restart')
  console.log('   The queued requests should be processed once reconnected')
  console.log('\n   Press Ctrl+C to exit')

  // Keep the script running
  await new Promise(() => {})
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...')
  process.exit(0)
})

// Run the script
main().catch(error => {
  console.error('❌ Script error:', error)
  process.exit(1)
})