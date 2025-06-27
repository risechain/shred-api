import type { Address, LogTopic } from 'viem'
import type { 
  ManagedSubscription, 
  ManagedSubscriptionConfig,
  SubscriptionStats 
} from './types'
import { watchShreds } from '../../actions/shred/watchShreds'
import { watchShredEvent } from '../../actions/shred/watchShredEvent'

class ManagedSubscriptionImpl implements ManagedSubscription {
  public readonly id: string
  public readonly type: 'shreds' | 'logs'
  
  private client: any
  private currentParams: any
  private onUpdate: (newParams: any) => Promise<void>
  private unsubscribeFn?: () => void
  
  private paused = false
  private eventCount = 0
  private createdAt: number
  private lastEventAt?: number
  private eventBuffer: any[] = []
  private temporaryHandler?: (event: any) => void
  
  constructor(config: ManagedSubscriptionConfig) {
    this.id = config.id
    this.type = config.type
    this.client = config.client
    this.currentParams = { ...config.initialParams }
    this.onUpdate = config.onUpdate
    this.createdAt = Date.now()
  }
  
  async start(): Promise<void> {
    if (this.unsubscribeFn) {
      this.unsubscribeFn()
    }
    
    const originalOnLogs = this.currentParams.onLogs || this.currentParams.onShred
    const wrappedHandler = (data: any) => {
      this.eventCount++
      this.lastEventAt = Date.now()
      
      // Handle temporary buffering during updates
      if (this.temporaryHandler) {
        this.temporaryHandler(data)
        return
      }
      
      // Handle pause state
      if (this.paused) {
        this.eventBuffer.push(data)
        return
      }
      
      // Normal event handling
      originalOnLogs?.(data)
    }
    
    // Create new subscription with wrapped handler by calling action functions directly
    if (this.type === 'shreds') {
      this.unsubscribeFn = await watchShreds(this.client, {
        ...this.currentParams,
        onShred: wrappedHandler,
        managed: false // Prevent recursive managed subscriptions
      })
    } else {
      this.unsubscribeFn = await watchShredEvent(this.client, {
        ...this.currentParams,
        onLogs: wrappedHandler,
        managed: false // Prevent recursive managed subscriptions
      })
    }
  }
  
  async restart(newParams: Partial<any>): Promise<void> {
    this.currentParams = { ...this.currentParams, ...newParams }
    await this.start()
  }
  
  async addAddress(address: Address): Promise<void> {
    const currentAddresses = this.currentParams.address 
      ? Array.isArray(this.currentParams.address) 
        ? this.currentParams.address 
        : [this.currentParams.address]
      : []
    
    if (!currentAddresses.includes(address)) {
      const newAddresses = [...currentAddresses, address]
      await this.onUpdate({ address: newAddresses })
    }
  }
  
  async removeAddress(address: Address): Promise<void> {
    const currentAddresses = this.currentParams.address 
      ? Array.isArray(this.currentParams.address) 
        ? this.currentParams.address 
        : [this.currentParams.address]
      : []
    
    const newAddresses = currentAddresses.filter((a: Address) => a !== address)
    if (newAddresses.length !== currentAddresses.length) {
      await this.onUpdate({ address: newAddresses })
    }
  }
  
  getAddresses(): Address[] {
    if (!this.currentParams.address) return []
    return Array.isArray(this.currentParams.address) 
      ? this.currentParams.address 
      : [this.currentParams.address]
  }
  
  async updateTopics(topics: LogTopic[]): Promise<void> {
    await this.onUpdate({ topics })
  }
  
  getTopics(): LogTopic[] {
    return this.currentParams.topics || []
  }
  
  pause(): void {
    this.paused = true
  }
  
  resume(): void {
    this.paused = false
    
    // Deliver buffered events
    const buffer = this.eventBuffer
    this.eventBuffer = []
    
    const handler = this.currentParams.onLogs || this.currentParams.onShred
    buffer.forEach(event => handler?.(event))
  }
  
  isPaused(): boolean {
    return this.paused
  }
  
  getStats(): SubscriptionStats {
    return {
      eventCount: this.eventCount,
      createdAt: this.createdAt,
      lastEventAt: this.lastEventAt,
      isPaused: this.paused,
      addresses: this.getAddresses(),
      topics: this.getTopics()
    }
  }
  
  async unsubscribe(): Promise<void> {
    if (this.unsubscribeFn) {
      this.unsubscribeFn()
      this.unsubscribeFn = undefined
    }
  }
  
  setTemporaryHandler(handler: (event: any) => void): void {
    this.temporaryHandler = handler
  }
  
  clearTemporaryHandler(): void {
    this.temporaryHandler = undefined
  }
  
  handleEvent(event: any): void {
    const handler = this.currentParams.onLogs || this.currentParams.onShred
    handler?.(event)
  }
}

export class SubscriptionManager {
  private subscriptions = new Map<string, ManagedSubscriptionImpl>()
  private subscriptionIdCounter = 0
  
  async createManagedSubscription(
    client: any,
    params: any
  ): Promise<ManagedSubscription> {
    const subscriptionId = `sub_${++this.subscriptionIdCounter}`
    const type = params.onShred ? 'shreds' : 'logs'
    
    // Create wrapper that manages state
    const managed = new ManagedSubscriptionImpl({
      id: subscriptionId,
      type,
      client,
      initialParams: params,
      onUpdate: async (newParams) => {
        // Handle dynamic updates
        await this.updateSubscription(subscriptionId, newParams)
      }
    })
    
    this.subscriptions.set(subscriptionId, managed)
    
    // Start initial subscription
    await managed.start()
    
    return managed
  }
  
  private async updateSubscription(
    id: string,
    newParams: Partial<any>
  ): Promise<void> {
    const managed = this.subscriptions.get(id)
    if (!managed) throw new Error('Subscription not found')
    
    // Strategy: Unsubscribe and resubscribe with event buffering
    const buffer: any[] = []
    const isPaused = managed.isPaused()
    
    // Temporarily buffer events
    const tempHandler = (event: any) => buffer.push(event)
    managed.setTemporaryHandler(tempHandler)
    
    // Perform update
    await managed.restart(newParams)
    
    // Replay buffered events
    buffer.forEach(event => managed.handleEvent(event))
    managed.clearTemporaryHandler()
    
    // Restore pause state
    if (isPaused) managed.pause()
  }
  
  getSubscription(id: string): ManagedSubscription | undefined {
    return this.subscriptions.get(id)
  }
  
  getAllSubscriptions(): ManagedSubscription[] {
    return Array.from(this.subscriptions.values())
  }
  
  async unsubscribeAll(): Promise<void> {
    const promises = Array.from(this.subscriptions.values()).map(sub => 
      sub.unsubscribe()
    )
    await Promise.all(promises)
    this.subscriptions.clear()
  }
}

// Global subscription manager instance
let globalSubscriptionManager: SubscriptionManager | null = null

export function getSubscriptionManager(): SubscriptionManager {
  if (!globalSubscriptionManager) {
    globalSubscriptionManager = new SubscriptionManager()
  }
  return globalSubscriptionManager
}