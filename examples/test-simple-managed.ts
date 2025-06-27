#!/usr/bin/env bun
/**
 * Simple test of managed subscriptions
 */
import { createPublicShredClient, shredsWebSocket } from '../src/viem'
import { riseTestnet } from 'viem/chains'

const WS_URL = 'wss://testnet.riselabs.xyz/ws'

async function testManagedSubscription() {
  console.log('🧪 Testing Simple Managed Subscription')
  console.log('📡 Creating client...')
  
  const client = createPublicShredClient({
    chain: riseTestnet,
    transport: shredsWebSocket(WS_URL)
  })
  
  console.log('📊 Client methods available:')
  console.log('- watchShreds:', typeof client.watchShreds)
  console.log('- watchShredEvent:', typeof client.watchShredEvent)
  console.log('- watchContractShredEvent:', typeof client.watchContractShredEvent)
  
  console.log('⏳ Waiting for connection...')
  await client.waitForConnection()
  console.log('✅ Connected!')
  
  console.log('📡 Testing managed watchShredEvent...')
  try {
    const result = await client.watchShredEvent({
      managed: true,
      onLogs: (logs) => {
        console.log('📦 Received logs:', logs.length)
      }
    })
    console.log('✅ Managed subscription created:', typeof result)
    console.log('✅ Subscription object:', !!result.subscription)
  } catch (error) {
    console.error('❌ Error creating managed subscription:', error)
  }
}

testManagedSubscription().catch(console.error)