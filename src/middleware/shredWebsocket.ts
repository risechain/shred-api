// shredWebSocket.ts
import { 
  webSocket, 
  type Transport, 
  type Chain,
  type WebSocketTransportConfig 
} from 'viem';

/**
 * RISE Chain subscription
 */
export interface ShredSubscription {
  id: string;
  unsubscribe: () => Promise<boolean>;
}

/**
 * Subscription parameters interface
 */
export interface ShredSubscribeParams<TResult> {
  method: string;
  params: any[];
  onData: (data: TResult) => void;
  onError?: (error: Error) => void;
}

/**
 * Extended Transport with RISE Chain subscription functionality
 */
export interface ShredTransport extends Omit<Transport, 'on'> {
  subscribe: <TResult = unknown>(params: ShredSubscribeParams<TResult>) => Promise<ShredSubscription>;
}

/**
 * Creates a WebSocket transport that supports RISE Chain's subscription methods
 * 
 * @param url WebSocket endpoint URL
 * @param config Transport configuration
 * @returns A transport creator function compatible with Viem clients
 */
export function shredWebSocket(url: string, config?: WebSocketTransportConfig) {
  return function shredWebSocketTransport({
    chain,
    pollingInterval = 4000,
    ...rest
  }: { chain?: Chain; pollingInterval?: number } = {}) {
    // Create WebSocket transport with viem helper
    const webSocketTransport = webSocket(url, config)({
      chain,
      pollingInterval,
      ...rest
    });
    
    // Create a Map to store subscriptions
    const subscriptions = new Map<string, {
      method: string;
      params: any[];
      onData: (data: any) => void;
      onError?: (error: Error) => void;
    }>();
    
    // Get WebSocket instance
    const getWebSocket = async () => {
      if (webSocketTransport.value && 'getSocket' in webSocketTransport.value) {
        return await webSocketTransport.value.getSocket();
      }
      throw new Error('WebSocket not available');
    };
    
    // Manually wire up event listeners when the WebSocket is ready
    const setupEventHandlers = async () => {
      try {
        const socket = await getWebSocket();
        
        // Set up message handler
        const originalOnMessage = socket.onmessage;
        socket.onmessage = (event) => {
          try {
            // Parse the message
            const data = typeof event.data === 'string' 
              ? JSON.parse(event.data) 
              : event.data;
            
            // Check if it's a subscription notification
            if (data.method === 'rise_subscription' && data.params?.subscription) {
              const subId = data.params.subscription;
              const sub = subscriptions.get(subId);
              
              if (sub) {
                try {
                  sub.onData(data.params.result);
                  return; // Skip original handler for subscription events
                } catch (err) {
                  const error = err instanceof Error ? err : new Error(String(err));
                  sub.onError?.(error);
                }
              }
            }
            
            // Forward to original handler for regular responses
            if (originalOnMessage) {
              originalOnMessage.call(socket, event);
            }
          } catch (err) {
            // Forward any parsing errors to original handler
            if (originalOnMessage) {
              originalOnMessage.call(socket, event);
            }
          }
        };
        
        // Set up close handler
        const originalOnClose = socket.onclose;
        socket.onclose = (event) => {
          // Clean up all subscriptions
          subscriptions.clear();
          
          // Forward to original handler
          if (originalOnClose) {
            originalOnClose.call(socket, event);
          }
        };
        
        // Set up error handler
        const originalOnError = socket.onerror;
        socket.onerror = (event) => {
          // Notify all subscription error handlers
          for (const [_, sub] of subscriptions.entries()) {
            if (sub.onError) {
              sub.onError(new Error('WebSocket connection error'));
            }
          }
          
          // Forward to original handler
          if (originalOnError) {
            originalOnError.call(socket, event);
          }
        };
      } catch (error) {
        console.error('Failed to set up WebSocket event handlers:', error);
      }
    };
    
    // Set up event handlers when transport is created
    setupEventHandlers();
    
    // Create the custom transport
    const transport: ShredTransport = {
      ...webSocketTransport,
      
      // Implement the subscribe method for RISE Chain subscriptions
      async subscribe<TResult>({ method, params, onData, onError }: ShredSubscribeParams<TResult>): Promise<ShredSubscription> {
        try {
          // Make the subscription request
          const subscriptionId = await webSocketTransport.request({
            method: method || 'rise_subscribe',
            params,
          }) as string;
          
          // Store the subscription
          if (typeof subscriptionId === 'string') {
            subscriptions.set(subscriptionId, { 
              method,
              params, 
              onData, 
              onError 
            });
            
            // Return subscription object with unsubscribe method
            return {
              id: subscriptionId,
              unsubscribe: async (): Promise<boolean> => {
                try {
                  // Send unsubscribe request
                  const success = await webSocketTransport.request({
                    method: 'rise_unsubscribe',
                    params: [subscriptionId],
                  }) as boolean;
                  
                  // Clean up successful unsubscribe
                  if (success) {
                    subscriptions.delete(subscriptionId);
                  }
                  
                  return success;
                } catch (err) {
                  console.error('Error unsubscribing:', err);
                  return false;
                }
              }
            };
          }
          
          throw new Error('Invalid subscription ID received');
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          if (onError) onError(error);
          throw error;
        }
      }
    };
    
    return transport;
  };
}