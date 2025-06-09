import { createPublicClient } from 'viem';
import { shredWebSocket, type ShredTransport } from '../src/middleware/shredWebsocket';
import 'dotenv/config';

// Load environment variables
const wsUrl = process.env.RPC_URL_WSS as string;
console.log(`Connecting to: ${wsUrl}`);

// ERC20 contract address to monitor
const contractAddress = process.env.TOKEN_ADDRESS as string || '0x6257c5f110900a8E02A7A480b097D44F96360d16';

// ERC20 Transfer event signature
const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

/**
 * Monitor ERC20 Transfer events using WebSocket and rise_subscribe with Viem client
 */
async function monitorTransferEvents() {
  try {
    // Create a client with our custom transport
    const client = createPublicClient({
      transport: shredWebSocket(wsUrl)
    });
    
    console.log('Connected to WebSocket server');
    
    // Access the transport to use our subscription API
    const transport = client.transport as unknown as ShredTransport;
    
    // Subscribe to Transfer events
    const subscription = await transport.subscribe({
      method: 'rise_subscribe',
      params: [
        'logs',
        {
          address: contractAddress,
          topics: [transferEventSignature]
        }
      ],
      onData: (data: any) => {
        const { result } = data;
        console.log(result)
        console.log('\nTransfer event detected:');
        console.log('  Transaction Hash:', result.transactionHash);
        console.log('  Block Number:', result.blockNumber);
        
        if (result.topics && result.topics.length >= 3) {
          // Extract addresses from topics (remove leading zeros)
          const from = '0x' + result.topics[1].substring(26);
          const to = '0x' + result.topics[2].substring(26);
          console.log('  From:', from);
          console.log('  To:', to);
          
          // If there's data, it's the amount (for ERC20 transfers)
          if (result.data) {
            console.log('  Amount (hex):', result.data);
          }
        }
        
        console.log('-----------------------------------');
      },
      onError: (error) => {
        console.error('Subscription error:', error);
      }
    });
    
    console.log(`Subscription created with ID: ${subscription.id}`);
    console.log('Monitoring for Transfer events. Press Ctrl+C to exit.');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nClosing subscription...');
      
      try {
        const success = await subscription.unsubscribe();
        console.log('Unsubscribed successfully:', success);
      } catch (error) {
        console.error('Error unsubscribing:', error);
      }
      
      console.log('Exiting.');
      process.exit(0);
    });
    
    // Keep the connection alive indefinitely
    await new Promise<void>(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Start monitoring
monitorTransferEvents();