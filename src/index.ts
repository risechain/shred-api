/**
 * RISE Chain Shred API
 * 
 * This package provides client libraries for RISE Chain's synchronous transaction functionality.
 * It includes support for both ethers.js and viem.
 */

// Ethers.js exports
export { SyncTransactionProvider } from './middleware/syncTransactionProvider';

// Viem exports 
export { syncTransport } from './middleware/syncTransactionTransport';
export { 
  createSyncPublicClient,
  type SyncPublicClient 
} from './middleware/syncTransactionClient';

// Re-export common utility types
export type { TransactionReceipt } from 'ethers';