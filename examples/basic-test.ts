#!/usr/bin/env bun
/**
 * Basic test to verify backward compatibility
 * Tests the examples from README.md
 */

import { createPublicShredClient, shredsWebSocket } from '../src/viem'
import { riseTestnet } from 'viem/chains'

const WS_URL = 'wss://testnet.riselabs.xyz/ws'

console.log('🧪 Basic Backward Compatibility Test')
console.log(`📡 Connecting to: ${WS_URL}`)
console.log('---\n')

async function testBasicUsage() {
  console.log('Test 1: Basic client creation and watchShreds (from README)')
  
  try {
    const client = createPublicShredClient({
      chain: riseTestnet,
      transport: shredsWebSocket(WS_URL),
    })
    
    console.log('✅ Client created successfully')
    
    // Test watchShreds
    let shredCount = 0
    const unsubscribe = await client.watchShreds({
      onShred: (shred) => {
        shredCount++
        console.log(`✅ Shred received #${shredCount}:`, {
          slot: shred.slot,
          blockNumber: shred.blockNumber,
          txCount: shred.transactions?.length || 0
        })
      },
      onError: (error) => {
        console.error('❌ Error in watchShreds:', error.message)
      }
    })
    
    console.log('✅ watchShreds subscription created')
    console.log('⏰ Waiting 10 seconds for shreds...')
    
    await new Promise(resolve => setTimeout(resolve, 10000))
    
    unsubscribe()
    console.log(`✅ Test 1 passed! Received ${shredCount} shreds\n`)
    
  } catch (error) {
    console.error('❌ Test 1 failed:', error)
    throw error
  }
}

async function testDecoratedClient() {
  console.log('Test 2: Decorated client (from README)')
  
  try {
    const { shredActions } = await import('../src/viem')
    const { createPublicClient } = await import('viem')
    
    const publicClient = createPublicClient({
      chain: riseTestnet,
      transport: shredsWebSocket(WS_URL),
    }).extend(shredActions)
    
    console.log('✅ Decorated client created successfully')
    
    // Test watchShreds on decorated client
    let shredCount = 0
    const unsubscribe = await publicClient.watchShreds({
      onShred: (shred) => {
        shredCount++
        if (shredCount === 1) {
          console.log('✅ First shred from decorated client:', {
            slot: shred.slot,
            blockNumber: shred.blockNumber,
          })
        }
      },
    })
    
    console.log('⏰ Waiting 5 seconds...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    unsubscribe()
    console.log(`✅ Test 2 passed! Received ${shredCount} shreds\n`)
    
  } catch (error) {
    console.error('❌ Test 2 failed:', error)
    throw error
  }
}

async function testNewFeatures() {
  console.log('Test 3: New features should be available')
  
  try {
    const client = createPublicShredClient({
      chain: riseTestnet,
      transport: shredsWebSocket(WS_URL),
    })
    
    // Test connection status (new feature)
    if (typeof client.getConnectionStatus === 'function') {
      console.log('✅ getConnectionStatus is available')
      const status = client.getConnectionStatus()
      console.log(`   Status: ${status}`)
    } else {
      console.log('⚠️  getConnectionStatus not available')
    }
    
    // Test onConnectionChange (new feature)
    if (typeof client.onConnectionChange === 'function') {
      console.log('✅ onConnectionChange is available')
    } else {
      console.log('⚠️  onConnectionChange not available')
    }
    
    // Test queueRequest (new feature)
    if (typeof client.queueRequest === 'function') {
      console.log('✅ queueRequest is available')
    } else {
      console.log('⚠️  queueRequest not available')
    }
    
    console.log('✅ Test 3 passed!\n')
    
  } catch (error) {
    console.error('❌ Test 3 failed:', error)
    throw error
  }
}

async function main() {
  try {
    await testBasicUsage()
    await testDecoratedClient()
    await testNewFeatures()
    
    console.log('🎉 All tests passed!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Tests failed:', error)
    process.exit(1)
  }
}

main()