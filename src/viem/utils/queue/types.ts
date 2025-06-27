export interface QueuedRequest {
  id: string
  method: string
  params: any[]
  priority: 'high' | 'normal' | 'low'
  createdAt: number
  retryCount: number
  maxRetries: number
  onSuccess?: (result: any) => void
  onError?: (error: Error) => void
  resolve: (value: any) => void
  reject: (reason: any) => void
}

export interface RequestQueueConfig {
  maxSize?: number
  maxRetries?: number
  retryDelay?: number
  processingInterval?: number
  priorityWeights?: {
    high: number
    normal: number
    low: number
  }
}

export interface RequestQueueStats {
  queueSize: number
  processing: number
  processed: number
  failed: number
  avgProcessingTime: number
  lastProcessedAt?: number
}

export interface RequestQueue {
  add: (
    request: Omit<
      QueuedRequest,
      'id' | 'createdAt' | 'retryCount' | 'resolve' | 'reject'
    >,
  ) => Promise<any>
  pause: () => void
  resume: () => void
  clear: () => void
  getStats: () => RequestQueueStats
  isPaused: () => boolean
  setMaxSize: (size: number) => void
  getQueuedRequests: () => QueuedRequest[]
}
