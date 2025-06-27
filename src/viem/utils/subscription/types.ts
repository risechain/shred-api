import type { Address, LogTopic } from 'viem'

export interface ManagedSubscription {
  id: string
  type: 'shreds' | 'logs'
  
  // Dynamic management methods
  addAddress(address: Address): Promise<void>
  removeAddress(address: Address): Promise<void>
  getAddresses(): Address[]
  updateTopics(topics: LogTopic[]): Promise<void>
  getTopics(): LogTopic[]
  
  // State control
  pause(): void
  resume(): void
  isPaused(): boolean
  
  // Statistics
  getStats(): {
    eventCount: number
    createdAt: number
    lastEventAt?: number
  }
  
  // Cleanup
  unsubscribe(): Promise<void>
}

export interface SubscriptionStats {
  eventCount: number
  createdAt: number
  lastEventAt?: number
  isPaused: boolean
  addresses: Address[]
  topics: LogTopic[]
}

export interface ManagedSubscriptionConfig {
  id: string
  type: 'shreds' | 'logs'
  client: any // Will be typed as PublicShredClient
  initialParams: any // Will be typed as WatchShredEventParameters
  onUpdate: (newParams: any) => Promise<void>
}