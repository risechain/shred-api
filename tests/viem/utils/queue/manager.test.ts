import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { RequestQueueManager, getRequestQueue, clearGlobalRequestQueue } from '../../../../src/viem/utils/queue/manager'

describe('Request Queue Manager', () => {
  let manager: RequestQueueManager
  let mockTransport: any
  let mockSocket: any
  
  beforeEach(() => {
    // Clear any existing global queue
    clearGlobalRequestQueue()
    
    // Mock WebSocket
    mockSocket = {
      readyState: 1, // OPEN
      send: vi.fn(),
    }
    
    // Mock transport
    mockTransport = {
      request: vi.fn().mockResolvedValue({ result: 'success' }),
      value: {
        getSocket: vi.fn().mockResolvedValue(mockSocket)
      }
    }
    
    manager = new RequestQueueManager(mockTransport)
  })
  
  afterEach(() => {
    manager.destroy()
  })

  describe('add', () => {
    it('should add request to queue and process it', async () => {
      const result = await manager.add({
        method: 'eth_blockNumber',
        params: [],
        priority: 'normal',
        maxRetries: 3
      })
      
      expect(result).toEqual({ result: 'success' })
      expect(mockTransport.request).toHaveBeenCalledWith({
        body: {
          method: 'eth_blockNumber',
          params: []
        }
      })
    })

    it('should respect priority ordering', async () => {
      // Pause to queue requests
      manager.pause()
      
      const requests = [
        manager.add({ method: 'low', params: [], priority: 'low', maxRetries: 3 }),
        manager.add({ method: 'high', params: [], priority: 'high', maxRetries: 3 }),
        manager.add({ method: 'normal', params: [], priority: 'normal', maxRetries: 3 }),
      ]
      
      // Check queue order
      const queued = manager.getQueuedRequests()
      expect(queued[0].method).toBe('high')
      expect(queued[1].method).toBe('normal')
      expect(queued[2].method).toBe('low')
      
      // Resume and process
      manager.resume()
      await Promise.all(requests)
    })

    it('should reject when queue is full', async () => {
      manager.setMaxSize(1)
      manager.pause()
      
      // First request should succeed
      const req1 = manager.add({ method: 'test1', params: [], priority: 'normal', maxRetries: 3 })
      
      // Second request should fail
      await expect(
        manager.add({ method: 'test2', params: [], priority: 'normal', maxRetries: 3 })
      ).rejects.toThrow('Request queue is full')
      
      manager.resume()
      await req1
    })
  })

  describe('retry mechanism', () => {
    it('should retry failed requests', async () => {
      let attempts = 0
      mockTransport.request.mockImplementation(() => {
        attempts++
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({ result: 'success' })
      })
      
      const result = await manager.add({
        method: 'eth_call',
        params: [],
        priority: 'normal',
        maxRetries: 3
      })
      
      expect(result).toEqual({ result: 'success' })
      expect(attempts).toBe(3)
    })

    it('should fail after max retries', async () => {
      mockTransport.request.mockRejectedValue(new Error('Persistent error'))
      
      await expect(
        manager.add({
          method: 'eth_call',
          params: [],
          priority: 'normal',
          maxRetries: 2
        })
      ).rejects.toThrow('Persistent error')
      
      expect(mockTransport.request).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })

    it('should re-queue when socket is not connected', async () => {
      mockSocket.readyState = 3 // CLOSED
      let connectAttempts = 0
      
      mockTransport.value.getSocket.mockImplementation(() => {
        connectAttempts++
        if (connectAttempts > 2) {
          mockSocket.readyState = 1 // OPEN
        }
        return Promise.resolve(mockSocket)
      })
      
      const result = await manager.add({
        method: 'eth_subscribe',
        params: [],
        priority: 'high',
        maxRetries: 5
      })
      
      expect(result).toEqual({ result: 'success' })
      expect(connectAttempts).toBeGreaterThan(2)
    })
  })

  describe('pause/resume', () => {
    it('should pause and resume processing', async () => {
      manager.pause()
      expect(manager.isPaused()).toBe(true)
      
      let processed = false
      const promise = manager.add({
        method: 'test',
        params: [],
        priority: 'normal',
        maxRetries: 3,
        onSuccess: () => { processed = true }
      })
      
      // Give some time for processing
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(processed).toBe(false)
      
      manager.resume()
      expect(manager.isPaused()).toBe(false)
      
      await promise
      expect(processed).toBe(true)
    })
  })

  describe('clear', () => {
    it('should clear all queued requests', async () => {
      manager.pause()
      
      const promises = [
        manager.add({ method: 'test1', params: [], priority: 'normal', maxRetries: 3 }),
        manager.add({ method: 'test2', params: [], priority: 'normal', maxRetries: 3 }),
      ]
      
      expect(manager.getQueuedRequests().length).toBe(2)
      
      manager.clear()
      
      expect(manager.getQueuedRequests().length).toBe(0)
      
      // All promises should reject
      for (const promise of promises) {
        await expect(promise).rejects.toThrow('Queue cleared')
      }
    })
  })

  describe('statistics', () => {
    it('should track queue statistics', async () => {
      const initialStats = manager.getStats()
      expect(initialStats).toEqual({
        queueSize: 0,
        processing: 0,
        processed: 0,
        failed: 0,
        avgProcessingTime: 0,
        lastProcessedAt: undefined
      })
      
      // Add delay to ensure processing time is measurable
      mockTransport.request.mockImplementation(() => {
        return new Promise(resolve => setTimeout(() => resolve({ result: 'success' }), 10))
      })
      
      // Process some requests
      await manager.add({ method: 'test1', params: [], priority: 'normal', maxRetries: 3 })
      await manager.add({ method: 'test2', params: [], priority: 'normal', maxRetries: 3 })
      
      // Fail one request
      mockTransport.request.mockRejectedValueOnce(new Error('Failed'))
      await expect(
        manager.add({ method: 'test3', params: [], priority: 'normal', maxRetries: 0 })
      ).rejects.toThrow()
      
      const stats = manager.getStats()
      expect(stats.processed).toBe(2)
      expect(stats.failed).toBe(1)
      expect(stats.avgProcessingTime).toBeGreaterThan(0)
      expect(stats.lastProcessedAt).toBeDefined()
    })
  })

  describe('callbacks', () => {
    it('should call onSuccess callback', async () => {
      const onSuccess = vi.fn()
      const onError = vi.fn()
      
      await manager.add({
        method: 'test',
        params: [],
        priority: 'normal',
        maxRetries: 3,
        onSuccess,
        onError
      })
      
      expect(onSuccess).toHaveBeenCalledWith({ result: 'success' })
      expect(onError).not.toHaveBeenCalled()
    })

    it('should call onError callback', async () => {
      const onSuccess = vi.fn()
      const onError = vi.fn()
      
      mockTransport.request.mockRejectedValue(new Error('Request failed'))
      
      await expect(
        manager.add({
          method: 'test',
          params: [],
          priority: 'normal',
          maxRetries: 0,
          onSuccess,
          onError
        })
      ).rejects.toThrow('Request failed')
      
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(onSuccess).not.toHaveBeenCalled()
    })
  })

  describe('global instance', () => {
    it('should return singleton instance', () => {
      const queue1 = getRequestQueue(mockTransport)
      const queue2 = getRequestQueue(mockTransport)
      
      expect(queue1).toBe(queue2)
    })

    it('should clear global instance', () => {
      const queue1 = getRequestQueue(mockTransport)
      clearGlobalRequestQueue()
      const queue2 = getRequestQueue(mockTransport)
      
      expect(queue1).not.toBe(queue2)
    })
  })
})