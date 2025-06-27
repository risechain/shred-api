import { describe, expect, it, vi, beforeEach } from 'vitest'
import { SubscriptionManager, getSubscriptionManager } from '../../../../src/viem/utils/subscription/manager'
import type { ManagedSubscription } from '../../../../src/viem/utils/subscription/types'

describe('Subscription Manager', () => {
  let manager: SubscriptionManager
  let mockClient: any
  
  beforeEach(() => {
    manager = new SubscriptionManager()
    
    // Mock client with watch methods
    mockClient = {
      watchShreds: vi.fn().mockReturnValue(() => {}),
      watchShredEvent: vi.fn().mockReturnValue(() => {}),
      watchContractShredEvent: vi.fn().mockReturnValue(() => {}),
    }
  })

  describe('createManagedSubscription', () => {
    it('should create a managed subscription for shreds', async () => {
      const onShred = vi.fn()
      const subscription = await manager.createManagedSubscription(mockClient, {
        onShred,
        onError: vi.fn(),
      })
      
      expect(subscription).toBeDefined()
      expect(subscription.id).toMatch(/^sub_\d+$/)
      expect(subscription.type).toBe('shreds')
      expect(mockClient.watchShreds).toHaveBeenCalledWith(
        expect.objectContaining({
          onShred: expect.any(Function),
          managed: false,
        })
      )
    })

    it('should create a managed subscription for events', async () => {
      const onLogs = vi.fn()
      const subscription = await manager.createManagedSubscription(mockClient, {
        address: '0x123',
        onLogs,
        onError: vi.fn(),
      })
      
      expect(subscription).toBeDefined()
      expect(subscription.type).toBe('logs')
      expect(mockClient.watchShredEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          address: '0x123',
          onLogs: expect.any(Function),
          managed: false,
        })
      )
    })
  })

  describe('ManagedSubscription', () => {
    let subscription: ManagedSubscription
    let onLogs: any
    
    beforeEach(async () => {
      onLogs = vi.fn()
      subscription = await manager.createManagedSubscription(mockClient, {
        address: '0x123',
        onLogs,
        onError: vi.fn(),
      })
    })

    describe('address management', () => {
      it('should add addresses dynamically', async () => {
        expect(subscription.getAddresses()).toEqual(['0x123'])
        
        await subscription.addAddress('0x456')
        expect(subscription.getAddresses()).toEqual(['0x123', '0x456'])
        
        // Should restart subscription with new addresses
        expect(mockClient.watchShredEvent).toHaveBeenCalledTimes(2)
      })

      it('should not add duplicate addresses', async () => {
        await subscription.addAddress('0x123')
        expect(subscription.getAddresses()).toEqual(['0x123'])
        
        // Should not restart subscription
        expect(mockClient.watchShredEvent).toHaveBeenCalledTimes(1)
      })

      it('should remove addresses dynamically', async () => {
        await subscription.addAddress('0x456')
        expect(subscription.getAddresses()).toEqual(['0x123', '0x456'])
        
        await subscription.removeAddress('0x123')
        expect(subscription.getAddresses()).toEqual(['0x456'])
        
        // Should restart subscription
        expect(mockClient.watchShredEvent).toHaveBeenCalledTimes(3)
      })

      it('should handle empty initial addresses', async () => {
        const sub = await manager.createManagedSubscription(mockClient, {
          onLogs: vi.fn(),
        })
        
        expect(sub.getAddresses()).toEqual([])
        
        await sub.addAddress('0x789')
        expect(sub.getAddresses()).toEqual(['0x789'])
      })
    })

    describe('pause/resume', () => {
      it('should pause and buffer events', async () => {
        // Get the wrapped handler
        const wrappedHandler = mockClient.watchShredEvent.mock.calls[0][0].onLogs
        
        subscription.pause()
        expect(subscription.isPaused()).toBe(true)
        
        // Send events while paused
        const event1 = { data: '0x1' }
        const event2 = { data: '0x2' }
        wrappedHandler(event1)
        wrappedHandler(event2)
        
        // Original handler should not be called
        expect(onLogs).not.toHaveBeenCalled()
        
        // Resume and check buffered events are delivered
        subscription.resume()
        expect(subscription.isPaused()).toBe(false)
        expect(onLogs).toHaveBeenCalledWith(event1)
        expect(onLogs).toHaveBeenCalledWith(event2)
      })
    })

    describe('statistics', () => {
      it('should track event statistics', async () => {
        const stats = subscription.getStats()
        expect(stats.eventCount).toBe(0)
        expect(stats.createdAt).toBeLessThanOrEqual(Date.now())
        expect(stats.lastEventAt).toBeUndefined()
        
        // Simulate events
        const wrappedHandler = mockClient.watchShredEvent.mock.calls[0][0].onLogs
        wrappedHandler({ data: '0x1' })
        wrappedHandler({ data: '0x2' })
        
        const newStats = subscription.getStats()
        expect(newStats.eventCount).toBe(2)
        expect(newStats.lastEventAt).toBeDefined()
      })
    })

    describe('unsubscribe', () => {
      it('should call underlying unsubscribe function', async () => {
        const unsubscribeFn = vi.fn()
        mockClient.watchShredEvent.mockReturnValue(unsubscribeFn)
        
        const sub = await manager.createManagedSubscription(mockClient, {
          onLogs: vi.fn(),
        })
        
        await sub.unsubscribe()
        expect(unsubscribeFn).toHaveBeenCalled()
      })
    })
  })

  describe('updateSubscription', () => {
    it('should buffer events during updates', async () => {
      const onLogs = vi.fn()
      const subscription = await manager.createManagedSubscription(mockClient, {
        address: '0x123',
        onLogs,
      })
      
      // Get the first wrapped handler
      const firstHandler = mockClient.watchShredEvent.mock.calls[0][0].onLogs
      
      // Start update (which will set temporary handler)
      const updatePromise = subscription.addAddress('0x456')
      
      // Send event during update
      const bufferedEvent = { data: '0xbuffered' }
      firstHandler(bufferedEvent)
      
      // Wait for update to complete
      await updatePromise
      
      // Verify event was replayed
      expect(onLogs).toHaveBeenCalledWith(bufferedEvent)
    })
  })

  describe('global instance', () => {
    it('should return singleton instance', () => {
      const manager1 = getSubscriptionManager()
      const manager2 = getSubscriptionManager()
      
      expect(manager1).toBe(manager2)
    })
  })
})