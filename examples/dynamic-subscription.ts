#!/usr/bin/env bun
/**
 * Dynamic subscription management example
 * 
 * This example demonstrates how to dynamically manage subscriptions by:
 * 1. Starting with an empty list of addresses
 * 2. Adding addresses as new DEX pairs are created
 * 3. Pausing/resuming event processing
 * 4. Viewing subscription statistics
 * 
 * Usage:
 * 1. Start a local WebSocket server
 * 2. Run: bun examples/dynamic-subscription.ts
 */

import { createPublicShredClient, shredsWebSocket } from '../src/viem'
import { riseTestnet } from 'viem/chains'
import { parseAbi } from 'viem'

// Configuration
const WS_URL = process.env.WS_URL || 'ws://localhost:8545'

// Example DEX Factory ABI (simplified)
const dexFactoryAbi = parseAbi([
  'event PairCreated(address indexed token0, address indexed token1, address pair, uint256)',
])

// Example DEX Pair ABI (simplified)
const dexPairAbi = parseAbi([
  'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)',
  'event Sync(uint112 reserve0, uint112 reserve1)',
  'event Mint(address indexed sender, uint256 amount0, uint256 amount1)',
  'event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to)',
])

console.log('🚀 Dynamic Subscription Management Example')
console.log(`📡 Connecting to: ${WS_URL}`)
console.log('---\n')

async function main() {
  // Create client
  const client = createPublicShredClient({
    chain: riseTestnet,
    transport: shredsWebSocket(WS_URL),
  })

  // Create managed subscription for DEX events
  console.log('📊 Creating managed subscription for DEX events...')
  
  const { subscription } = await client.watchContractShredEvent({
    managed: true,        // Enable dynamic management
    buffered: true,       // Buffer events during updates
    abi: dexPairAbi,
    eventName: 'Swap',
    address: [],          // Start with no addresses
    onLogs: (logs) => {
      logs.forEach(log => {
        console.log(`\n💱 Swap detected on ${log.address}:`)
        console.log(`   From: ${log.args?.sender}`)
        console.log(`   In: ${log.args?.amount0In} / ${log.args?.amount1In}`)
        console.log(`   Out: ${log.args?.amount0Out} / ${log.args?.amount1Out}`)
        console.log(`   To: ${log.args?.to}`)
      })
    },
    onError: (error) => {
      console.error('❌ Subscription error:', error.message)
    },
  })

  if (!subscription) {
    console.error('Failed to create managed subscription')
    return
  }

  console.log(`✅ Subscription created: ${subscription.id}`)
  console.log(`📊 Initial stats:`, subscription.getStats())

  // Simulate monitoring factory for new pairs
  console.log('\n👀 Monitoring for new DEX pairs...')
  
  // Example: Add some test addresses (in real scenario, these would come from PairCreated events)
  const testPairs = [
    '0x1111111111111111111111111111111111111111',
    '0x2222222222222222222222222222222222222222',
    '0x3333333333333333333333333333333333333333',
  ]

  // Add pairs dynamically
  for (const [index, pairAddress] of testPairs.entries()) {
    await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
    
    console.log(`\n🆕 New pair detected: ${pairAddress}`)
    await subscription.addAddress(pairAddress as `0x${string}`)
    
    const addresses = subscription.getAddresses()
    console.log(`📍 Now monitoring ${addresses.length} pairs:`)
    addresses.forEach(addr => console.log(`   - ${addr}`))
  }

  // Demonstrate pause/resume
  console.log('\n⏸️  Pausing subscription for 5 seconds...')
  subscription.pause()
  
  setTimeout(() => {
    console.log('▶️  Resuming subscription...')
    subscription.resume()
    
    // Show final stats
    const stats = subscription.getStats()
    console.log('\n📊 Final subscription stats:')
    console.log(`   ID: ${subscription.id}`)
    console.log(`   Type: ${subscription.type}`)
    console.log(`   Event count: ${stats.eventCount}`)
    console.log(`   Created: ${new Date(stats.createdAt).toLocaleTimeString()}`)
    console.log(`   Last event: ${stats.lastEventAt ? new Date(stats.lastEventAt).toLocaleTimeString() : 'None'}`)
    console.log(`   Addresses: ${stats.addresses.length}`)
    console.log(`   Paused: ${stats.isPaused}`)
  }, 5000)

  // Interactive commands
  console.log('\n📝 Interactive commands:')
  console.log('   a <address> - Add address to subscription')
  console.log('   r <address> - Remove address from subscription')
  console.log('   p - Pause/resume subscription')
  console.log('   s - Show statistics')
  console.log('   q - Quit\n')

  // Handle user input
  process.stdin.on('data', async (data) => {
    const input = data.toString().trim()
    const [command, ...args] = input.split(' ')

    switch (command) {
      case 'a':
        if (args[0]) {
          await subscription.addAddress(args[0] as `0x${string}`)
          console.log(`✅ Added ${args[0]}`)
          console.log(`📍 Now monitoring: ${subscription.getAddresses().join(', ')}`)
        }
        break
        
      case 'r':
        if (args[0]) {
          await subscription.removeAddress(args[0] as `0x${string}`)
          console.log(`✅ Removed ${args[0]}`)
          console.log(`📍 Now monitoring: ${subscription.getAddresses().join(', ')}`)
        }
        break
        
      case 'p':
        if (subscription.isPaused()) {
          subscription.resume()
          console.log('▶️  Subscription resumed')
        } else {
          subscription.pause()
          console.log('⏸️  Subscription paused')
        }
        break
        
      case 's':
        console.log('📊 Current stats:', subscription.getStats())
        break
        
      case 'q':
        console.log('👋 Unsubscribing and exiting...')
        await subscription.unsubscribe()
        process.exit(0)
        
      default:
        console.log('❓ Unknown command')
    }
  })

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down...')
    await subscription.unsubscribe()
    process.exit(0)
  })
}

// Run the example
main().catch(console.error)