import {
  getRequestQueue,
  type RequestQueueManager,
} from '../../utils/queue/manager'
import type {
  QueuedRequest,
  RequestQueue,
  RequestQueueStats,
} from '../../utils/queue/types'
import type { Client } from 'viem'

export type QueueActions = {
  /**
   * Queue a request to be processed when the connection is available
   */
  queueRequest: (params: {
    method: string
    params: any[]
    priority?: 'high' | 'normal' | 'low'
    onSuccess?: (result: any) => void
    onError?: (error: Error) => void
  }) => Promise<any>

  /**
   * Get the current request queue instance
   */
  getRequestQueue: () => RequestQueue

  /**
   * Get queue statistics
   */
  getQueueStats: () => RequestQueueStats

  /**
   * Pause request processing
   */
  pauseQueue: () => void

  /**
   * Resume request processing
   */
  resumeQueue: () => void

  /**
   * Clear all queued requests
   */
  clearQueue: () => void

  /**
   * Get all queued requests
   */
  getQueuedRequests: () => Omit<QueuedRequest, 'resolve' | 'reject'>[]
}

export function queueActions<TClient extends Client>(
  client: TClient,
): QueueActions {
  // Get or create queue manager
  let queueManager: RequestQueueManager | null = null

  const getQueue = () => {
    if (!queueManager) {
      // Get the underlying transport
      const transport = client.transport
      if (!transport) {
        throw new Error('Transport not available')
      }

      // Create queue with connection awareness
      queueManager = getRequestQueue(transport, {
        processingInterval: 200, // Slightly slower to avoid overwhelming connection checks
        retryDelay: 1000,
        maxRetries: 5, // Increase retries for connection issues
      })
    }
    return queueManager
  }

  return {
    queueRequest: ({
      method,
      params,
      priority = 'normal',
      onSuccess,
      onError,
    }) => {
      const queue = getQueue()
      return queue.add({
        method,
        params,
        priority,
        maxRetries: 3,
        onSuccess,
        onError,
      })
    },

    getRequestQueue: () => getQueue(),

    getQueueStats: () => getQueue().getStats(),

    pauseQueue: () => getQueue().pause(),

    resumeQueue: () => getQueue().resume(),

    clearQueue: () => getQueue().clear(),

    getQueuedRequests: () => {
      const requests = getQueue().getQueuedRequests()
      // Remove resolve/reject functions before returning
      return requests.map(({ resolve, reject, ...rest }) => rest)
    },
  }
}
