#!/usr/bin/env bun
/**
 * Test dynamic subscription management without connection monitoring
 * Tests with real RISE testnet ERC20 contracts: WETH and USDC
 */

import { createPublicShredClient, shredsWebSocket } from '../src/viem'
import { riseTestnet } from 'viem/chains'
import { parseAbi } from 'viem'

// Configuration
const WS_URL = 'wss://testnet.riselabs.xyz/ws'

// Contract addresses
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006' as const
const USDC_ADDRESS = '0x8a93d247134d91e0de6f96547cb0204e5be8e5d8' as const

// Standard ERC20 ABI events
const erc20Abi = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
])

console.log('🚀 Testing Dynamic Subscription Management (Simple)')
console.log(`📡 Connecting to: ${WS_URL}`)
console.log('---\n')

async function main() {
  // Create client
  const client = createPublicShredClient({
    chain: riseTestnet,
    transport: shredsWebSocket(WS_URL),
  })

  // Give it a moment to connect
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Create managed subscription starting with only WETH
  console.log('📊 Creating managed subscription for ERC20 events...')
  console.log(`   Starting with WETH: ${WETH_ADDRESS}`)
  
  const result = await client.watchContractShredEvent({
    managed: true,        // Enable dynamic management
    buffered: true,       // Buffer events during updates
    abi: erc20Abi,
    address: [WETH_ADDRESS], // Start with only WETH
    onLogs: (logs) => {
      logs.forEach(log => {
        const tokenName = log.address.toLowerCase() === WETH_ADDRESS.toLowerCase() ? 'WETH' : 'USDC'
        console.log(`\n🔔 ${tokenName} ${log.eventName}:`)
        
        if (log.eventName === 'Transfer') {
          console.log(`   From: ${log.args?.from}`)
          console.log(`   To: ${log.args?.to}`)
          console.log(`   Value: ${log.args?.value}`)
        } else if (log.eventName === 'Approval') {
          console.log(`   Owner: ${log.args?.owner}`)
          console.log(`   Spender: ${log.args?.spender}`)
          console.log(`   Value: ${log.args?.value}`)
        }
        
        console.log(`   Block: ${log.blockNumber}`)
        console.log(`   Tx: ${log.transactionHash}`)
      })
    },
    onError: (error) => {
      console.error('❌ Subscription error:', error.message)
    },
  })

  const subscription = result.subscription
  if (!subscription) {
    console.error('Failed to create managed subscription')
    return
  }

  console.log(`✅ Subscription created: ${subscription.id}`)
  console.log(`📊 Initial stats:`, subscription.getStats())
  console.log(`📍 Monitoring addresses:`, subscription.getAddresses())

  // Wait a bit before adding USDC
  console.log('\n⏰ Monitoring WETH events for 10 seconds...')
  await new Promise(resolve => setTimeout(resolve, 10000))

  // Add USDC to the subscription
  console.log(`\n🆕 Adding USDC to subscription: ${USDC_ADDRESS}`)
  await subscription.addAddress(USDC_ADDRESS)
  
  const addresses = subscription.getAddresses()
  console.log(`📍 Now monitoring ${addresses.length} addresses:`)
  addresses.forEach(addr => {
    const name = addr.toLowerCase() === WETH_ADDRESS.toLowerCase() ? 'WETH' : 'USDC'
    console.log(`   - ${name}: ${addr}`)
  })

  // Monitor both tokens
  console.log('\n⏰ Monitoring both WETH and USDC events for 20 seconds...')
  await new Promise(resolve => setTimeout(resolve, 20000))

  // Show statistics
  const stats = subscription.getStats()
  console.log('\n📊 Subscription statistics:')
  console.log(`   ID: ${subscription.id}`)
  console.log(`   Type: ${subscription.type}`)
  console.log(`   Event count: ${stats.eventCount}`)
  console.log(`   Created: ${new Date(stats.createdAt).toLocaleTimeString()}`)
  console.log(`   Last event: ${stats.lastEventAt ? new Date(stats.lastEventAt).toLocaleTimeString() : 'None'}`)
  console.log(`   Addresses: ${stats.addresses.length}`)
  console.log(`   Paused: ${stats.isPaused}`)

  // Test pause/resume
  console.log('\n⏸️  Pausing subscription for 5 seconds...')
  subscription.pause()
  
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  console.log('▶️  Resuming subscription...')
  subscription.resume()
  
  // Monitor for 5 more seconds
  await new Promise(resolve => setTimeout(resolve, 5000))

  // Remove WETH and monitor only USDC
  console.log(`\n🔄 Removing WETH from subscription...`)
  await subscription.removeAddress(WETH_ADDRESS)
  console.log(`📍 Now monitoring only USDC: ${subscription.getAddresses()}`)
  
  console.log('\n⏰ Monitoring only USDC events for 10 seconds...')
  await new Promise(resolve => setTimeout(resolve, 10000))

  // Final stats
  const finalStats = subscription.getStats()
  console.log('\n📊 Final statistics:')
  console.log(`   Total events received: ${finalStats.eventCount}`)
  console.log(`   Monitoring duration: ${Math.round((Date.now() - finalStats.createdAt) / 1000)}s`)

  // Cleanup
  console.log('\n👋 Unsubscribing and exiting...')
  await subscription.unsubscribe()
  
  process.exit(0)
}

// Run the script
main().catch(error => {
  console.error('❌ Script error:', error)
  process.exit(1)
})