import type {
  QueuedRequest,
  RequestQueue,
  RequestQueueConfig,
  RequestQueueStats,
} from './types'

export class RequestQueueManager implements RequestQueue {
  private queue: QueuedRequest[] = []
  private processing = new Set<string>()
  private paused = false
  private requestIdCounter = 0
  private processingTimer?: NodeJS.Timeout

  // Stats
  private processed = 0
  private failed = 0
  private totalProcessingTime = 0
  private lastProcessedAt?: number

  // Config
  private maxSize: number
  private maxRetries: number
  private retryDelay: number
  private processingInterval: number
  private priorityWeights: { high: number; normal: number; low: number }

  // Transport reference
  private transport: any
  private connectionManager: any = null

  constructor(transport: any, config: RequestQueueConfig = {}) {
    this.transport = transport
    this.maxSize = config.maxSize ?? 1000
    this.maxRetries = config.maxRetries ?? 3
    this.retryDelay = config.retryDelay ?? 1000
    this.processingInterval = config.processingInterval ?? 100
    this.priorityWeights = config.priorityWeights ?? {
      high: 3,
      normal: 2,
      low: 1,
    }

    // Initialize connection manager and start processing when ready
    this.initializeConnectionManager()
  }

  add(
    request: Omit<
      QueuedRequest,
      'id' | 'createdAt' | 'retryCount' | 'resolve' | 'reject'
    >,
  ): Promise<any> {
    if (this.queue.length >= this.maxSize) {
      throw new Error(`Request queue is full (max: ${this.maxSize})`)
    }

    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        ...request,
        id: `req_${++this.requestIdCounter}`,
        createdAt: Date.now(),
        retryCount: 0,
        resolve,
        reject,
      }

      // Insert based on priority
      const insertIndex = this.findInsertIndex(queuedRequest.priority)
      this.queue.splice(insertIndex, 0, queuedRequest)

      // Process immediately if not paused
      if (!this.paused) {
        this.processQueue()
      }
    })
  }

  private findInsertIndex(priority: 'high' | 'normal' | 'low'): number {
    const weight = this.priorityWeights[priority]

    for (let i = 0; i < this.queue.length; i++) {
      const itemWeight = this.priorityWeights[this.queue[i].priority]
      if (weight > itemWeight) {
        return i
      }
    }

    return this.queue.length
  }

  private startProcessing(): void {
    this.processingTimer = setInterval(() => {
      if (!this.paused && this.queue.length > 0) {
        this.processQueue()
      }
    }, this.processingInterval)
  }

  private async processQueue(): Promise<void> {
    // Process multiple requests in parallel (up to 5)
    const batchSize = Math.min(5, this.queue.length)
    const batch: QueuedRequest[] = []

    for (let i = 0; i < batchSize; i++) {
      const request = this.queue.shift()
      if (request && !this.processing.has(request.id)) {
        batch.push(request)
        this.processing.add(request.id)
      }
    }

    // Process batch
    await Promise.all(batch.map((request) => this.processRequest(request)))
  }

  private async processRequest(request: QueuedRequest): Promise<void> {
    const startTime = Date.now()

    try {
      // Use improved connection checking
      if (!(await this.isConnectionReady())) {
        // Re-queue if not connected
        if (request.retryCount < this.maxRetries) {
          request.retryCount++
          // Add delay before retry based on connection status
          const delay =
            this.connectionManager?.getStatus() === 'connecting'
              ? 500
              : this.retryDelay
          setTimeout(() => {
            this.queue.unshift(request)
          }, delay * request.retryCount)
          this.processing.delete(request.id)
          return
        } else {
          throw new Error('WebSocket not connected after max retries')
        }
      }

      // Send request using transport's request method
      const result = await this.transport.request({
        body: {
          method: request.method,
          params: request.params,
        },
      })

      // Success
      this.processed++
      this.totalProcessingTime += Date.now() - startTime
      this.lastProcessedAt = Date.now()

      request.resolve(result)
      request.onSuccess?.(result)
    } catch (error: any) {
      // Handle error
      if (request.retryCount < request.maxRetries) {
        // Retry with delay
        request.retryCount++
        setTimeout(() => {
          this.queue.unshift(request) // Add back to front with higher priority
        }, this.retryDelay * request.retryCount)
      } else {
        // Final failure
        this.failed++
        request.reject(error)
        request.onError?.(error)
      }
    } finally {
      this.processing.delete(request.id)
    }
  }

  private async getSocket(): Promise<WebSocket | null> {
    try {
      // Match the pattern used in connection decorators
      if (this.transport?.getRpcClient) {
        const rpcClient = await this.transport.getRpcClient()
        return rpcClient?.socket
      }

      if (this.transport?.value?.getRpcClient) {
        const rpcClient = await this.transport.value.getRpcClient()
        return rpcClient?.socket
      }

      // Fallback for direct socket access
      if (this.transport?.getSocket) {
        return await this.transport.getSocket()
      }

      if (this.transport?.value?.getSocket) {
        return await this.transport.value.getSocket()
      }

      return null
    } catch {
      return null
    }
  }

  pause(): void {
    this.paused = true
  }

  resume(): void {
    this.paused = false
    if (this.queue.length > 0) {
      this.processQueue()
    }
  }

  private async initializeConnectionManager(): Promise<void> {
    try {
      if (this.transport?.getRpcClient) {
        const rpcClient = await this.transport.getRpcClient()
        this.connectionManager = rpcClient?.connectionManager
      } else if (this.transport?.value?.getRpcClient) {
        const rpcClient = await this.transport.value.getRpcClient()
        this.connectionManager = rpcClient?.connectionManager
      }

      // Start processing only after connection manager is available
      if (this.connectionManager) {
        // Wait for connection before starting
        if (this.connectionManager.getStatus() === 'connected') {
          this.startProcessing()
        } else {
          this.connectionManager.on('statusChange', (status: string) => {
            if (status === 'connected' && !this.processingTimer) {
              this.startProcessing()
            } else if (status !== 'connected') {
              this.pause()
            }
          })
        }
      } else {
        // Fallback - start processing after delay
        setTimeout(() => this.startProcessing(), 1000)
      }
    } catch (error) {
      console.warn('Failed to initialize connection manager:', error)
      // Fallback - start processing after delay
      setTimeout(() => this.startProcessing(), 1000)
    }
  }

  private async isConnectionReady(): Promise<boolean> {
    try {
      // First check connection manager status
      if (this.connectionManager) {
        const status = this.connectionManager.getStatus()
        if (status !== 'connected') {
          return false
        }
      }

      // Then verify socket is available and ready
      const socket = await this.getSocket()
      return Boolean(socket && socket.readyState === 1)
    } catch {
      return false
    }
  }

  clear(): void {
    // Reject all pending requests
    this.queue.forEach((request) => {
      request.reject(new Error('Queue cleared'))
    })
    this.queue = []
    this.processing.clear()
  }

  getStats(): RequestQueueStats {
    return {
      queueSize: this.queue.length,
      processing: this.processing.size,
      processed: this.processed,
      failed: this.failed,
      avgProcessingTime:
        this.processed > 0 ? this.totalProcessingTime / this.processed : 0,
      lastProcessedAt: this.lastProcessedAt,
    }
  }

  isPaused(): boolean {
    return this.paused
  }

  setMaxSize(size: number): void {
    this.maxSize = size
  }

  getQueuedRequests(): QueuedRequest[] {
    return [...this.queue]
  }

  destroy(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer)
    }
    this.clear()
  }
}

// Global instance management
let globalRequestQueue: RequestQueueManager | null = null

export function getRequestQueue(
  transport: any,
  config?: RequestQueueConfig,
): RequestQueueManager {
  if (!globalRequestQueue) {
    globalRequestQueue = new RequestQueueManager(transport, config)
  }
  return globalRequestQueue
}

export function clearGlobalRequestQueue(): void {
  if (globalRequestQueue) {
    globalRequestQueue.destroy()
    globalRequestQueue = null
  }
}
