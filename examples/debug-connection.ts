#!/usr/bin/env bun
/**
 * Debug connection manager accessibility
 */
import { createPublicShredClient, shredsWebSocket } from '../src/viem'
import { riseTestnet } from 'viem/chains'

const WS_URL = 'wss://testnet.riselabs.xyz/ws'

async function debugConnection() {
  console.log('🔍 Debugging Connection Manager Access')
  console.log('📡 Creating client...')
  
  const client = createPublicShredClient({
    chain: riseTestnet,
    transport: shredsWebSocket(WS_URL, {
      reconnect: { attempts: 3, delay: 1000 }
    })
  })
  
  console.log('📦 Client created, inspecting transport...')
  console.log('Transport type:', typeof client.transport)
  console.log('Transport value:', !!client.transport.value)
  console.log('Transport getRpcClient (direct):', typeof (client.transport as any).getRpcClient)
  
  // Check direct transport methods (after viem processing)
  if ((client.transport as any).getRpcClient) {
    console.log('🔧 Getting RPC client from direct transport...')
    try {
      const rpcClient = await (client.transport as any).getRpcClient()
      console.log('RPC client:', !!rpcClient)
      console.log('Connection manager:', !!rpcClient?.connectionManager)
      console.log('Connection manager type:', typeof rpcClient?.connectionManager)
      
      if (rpcClient?.connectionManager) {
        console.log('Connection manager methods:', Object.getOwnPropertyNames(rpcClient.connectionManager))
        console.log('Connection manager status:', rpcClient.connectionManager.getStatus?.())
      }
    } catch (error) {
      console.error('❌ Error getting RPC client from direct transport:', error)
    }
  }
  
  // Check legacy transport.value
  if (client.transport.value && (client.transport as any).value.getRpcClient) {
    console.log('🔧 Getting RPC client from transport.value...')
    try {
      const rpcClient = await client.transport.value.getRpcClient()
      console.log('RPC client (value):', !!rpcClient)
      console.log('Connection manager (value):', !!rpcClient?.connectionManager)
    } catch (error) {
      console.error('❌ Error getting RPC client from transport.value:', error)
    }
  }
  
  // Test the connection actions
  console.log('🎯 Testing connection actions...')
  try {
    const status = client.getConnectionStatus()
    console.log('✅ Connection status:', status)
  } catch (error) {
    console.error('❌ Error getting connection status:', error)
  }
  
  try {
    const stats = client.getConnectionStats()
    console.log('✅ Connection stats:', stats)
  } catch (error) {
    console.error('❌ Error getting connection stats:', error)
  }
  
  // Wait a bit to let connection establish
  console.log('⏰ Waiting 2 seconds for connection...')
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  try {
    const status = client.getConnectionStatus()
    console.log('✅ Connection status after wait:', status)
    const stats = client.getConnectionStats()
    console.log('✅ Connection stats after wait:', stats)
  } catch (error) {
    console.error('❌ Error after wait:', error)
  }
}

debugConnection().catch(console.error)