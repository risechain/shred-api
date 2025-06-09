import WebSocket from 'ws';
import { ethers } from 'ethers';
import 'dotenv/config';

// Load environment variables
const wsUrl = process.env.RPC_URL_WSS as string;
console.log(`Connecting to: ${wsUrl}`);

// ERC20 contract address to monitor
const contractAddress = process.env.TOKEN_ADDRESS as string || '0x6257c5f110900a8E02A7A480b097D44F96360d16';

// ERC20 Transfer event signature - generated from event ABI
// Transfer(address indexed from, address indexed to, uint256 value)
const transferEventSignature = ethers.id('Transfer(address,address,uint256)');
console.log('Transfer event signature:', transferEventSignature);

// Track request IDs and callbacks
const pendingRequests: Record<number, (error: Error | null, result?: any) => void> = {};
let nextId = 1;

/**
 * Send a JSON-RPC request and return a promise with the result
 */
function sendRequest(
  ws: WebSocket, 
  method: string, 
  params: any[]
): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    
    // Store callback
    pendingRequests[id] = (error, result) => {
      if (error) reject(error);
      else resolve(result);
    };
    
    // Send request
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };
    
    ws.send(JSON.stringify(request));
  });
}

/**
 * Monitor ERC20 Transfer events using WebSocket and rise_subscribe
 */
async function monitorTransferEvents() {
  let ws: WebSocket | null = null;
  let subscriptionId: string | null = null;
  
  try {
    // Connect to WebSocket endpoint
    ws = new WebSocket(wsUrl);
    
    // Set up message handler
    ws.on('message', (data: Buffer) => {
      try {
        const response = JSON.parse(data.toString());
        
        // Handle subscription notifications
        if (response.method === 'rise_subscription' && response.params?.subscription) {
          const result = response.params.result;
          
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
          return;
        }
        
        // Handle RPC responses
        if (response.id && pendingRequests[response.id]) {
          if (response.error) {
            pendingRequests[response.id](new Error(response.error.message || 'Unknown error'));
          } else {
            pendingRequests[response.id](null, response.result);
          }
          
          delete pendingRequests[response.id];
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });
    
    // Wait for connection to be established
    await new Promise<void>((resolve, reject) => {
      ws!.on('open', () => resolve());
      ws!.on('error', (error) => reject(error));
    });
    
    console.log('Connected to WebSocket server');
    
    // Subscribe to Transfer events
    subscriptionId = await sendRequest(ws, 'rise_subscribe', [
      'logs',
      {
        address: contractAddress,
        topics: [transferEventSignature]
      }
    ]);
    
    console.log(`Subscription created with ID: ${subscriptionId}`);
    console.log('Monitoring for Transfer events. Press Ctrl+C to exit.');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nClosing subscription...');
      
      if (ws && ws.readyState === WebSocket.OPEN && subscriptionId) {
        try {
          await sendRequest(ws, 'rise_unsubscribe', [subscriptionId]);
          console.log('Unsubscribed successfully');
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      }
      
      if (ws) {
        ws.close();
      }
      
      console.log('Exiting.');
      process.exit(0);
    });
    
    // Keep the connection alive indefinitely
    await new Promise<void>(() => {});
    
  } catch (error) {
    console.error('Error:', error);
    
    if (ws) {
      ws.close();
    }
    
    process.exit(1);
  }
}

// Start monitoring
monitorTransferEvents();