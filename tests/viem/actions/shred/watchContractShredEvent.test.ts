import { beforeEach, describe, expect, it, vi } from 'vitest'
import { watchContractShredEvent } from '../../../../src/viem/actions/shred/watchContractShredEvent'
import type { ShredsWebSocketTransport } from '../../../../src/viem/clients/transports/shredsWebSocket'
import type { Abi, Chain, Client } from 'viem'

// Mock ABI for testing
const mockAbi = [
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const satisfies Abi

// Mock transport
const createMockTransport = () => ({
  type: 'webSocket' as const,
  riseSubscribe: vi.fn(),
})

// Mock client
const createMockClient = (transport: any) =>
  ({
    transport,
  }) as unknown as Client<ShredsWebSocketTransport, Chain>

describe('watchContractShredEvent', () => {
  let mockTransport: ReturnType<typeof createMockTransport>
  let mockClient: Client<ShredsWebSocketTransport, Chain>
  let mockOnLogs: ReturnType<typeof vi.fn>
  let mockOnError: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockTransport = createMockTransport()
    mockClient = createMockClient(mockTransport)
    mockOnLogs = vi.fn()
    mockOnError = vi.fn()
  })

  it('should subscribe to contract events and call onLogs', async () => {
    const mockUnsubscribe = vi.fn()
    mockTransport.riseSubscribe.mockResolvedValue({
      unsubscribe: mockUnsubscribe,
    })

    const unsubscribe = await watchContractShredEvent(mockClient, {
      abi: mockAbi,
      address: '0x123',
      eventName: 'Transfer',
      onLogs: mockOnLogs,
    })

    expect(mockTransport.riseSubscribe).toHaveBeenCalledWith({
      params: ['logs', { address: '0x123', topics: expect.any(Array) }],
      onData: expect.any(Function),
      onError: expect.any(Function),
    })

    expect(typeof unsubscribe).toBe('function')
  })

  it('should handle log data and decode events', async () => {
    const mockUnsubscribe = vi.fn()
    let onDataCallback: (data: any) => void

    mockTransport.riseSubscribe.mockImplementation(({ onData }) => {
      onDataCallback = onData
      return Promise.resolve({ unsubscribe: mockUnsubscribe })
    })

    watchContractShredEvent(mockClient, {
      abi: mockAbi,
      address: '0x123',
      eventName: 'Transfer',
      onLogs: mockOnLogs,
    })

    // Wait for subscription to be set up
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Simulate receiving log data
    const mockLogData = {
      result: {
        address: '0x123',
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          '0x000000000000000000000000a0b86a33e6c3b4c6b4b6b4b6b4b6b4b6b4b6b4b6',
          '0x000000000000000000000000b0b86a33e6c3b4c6b4b6b4b6b4b6b4b6b4b6b4b6',
        ],
        data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
        blockNumber: '0x1',
        transactionHash: '0xabc',
      },
    }

    onDataCallback!(mockLogData)

    expect(mockOnLogs).toHaveBeenCalled()
  })

  it('should handle errors during subscription', async () => {
    const error = new Error('Subscription failed')
    mockTransport.riseSubscribe.mockRejectedValue(error)

    watchContractShredEvent(mockClient, {
      abi: mockAbi,
      address: '0x123',
      eventName: 'Transfer',
      onLogs: mockOnLogs,
      onError: mockOnError,
    })

    // Wait for error to be handled
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(mockOnError).toHaveBeenCalledWith(error)
  })

  it('should handle decode errors gracefully', async () => {
    const mockUnsubscribe = vi.fn()
    let onDataCallback: (data: any) => void

    mockTransport.riseSubscribe.mockImplementation(({ onData }) => {
      onDataCallback = onData
      return Promise.resolve({ unsubscribe: mockUnsubscribe })
    })

    watchContractShredEvent(mockClient, {
      abi: mockAbi,
      address: '0x123',
      eventName: 'Transfer',
      onLogs: mockOnLogs,
      strict: false,
    })

    await new Promise((resolve) => setTimeout(resolve, 0))

    // Simulate receiving malformed log data
    const mockBadLogData = {
      result: {
        address: '0x123',
        topics: ['0xbadtopic'],
        data: '0xbaddata',
        blockNumber: '0x1',
        transactionHash: '0xabc',
      },
    }

    onDataCallback!(mockBadLogData)

    // Should still call onLogs even with decode errors
    expect(mockOnLogs).toHaveBeenCalled()
  })

  it('should unsubscribe when returned function is called', async () => {
    const mockUnsubscribe = vi.fn()
    mockTransport.riseSubscribe.mockResolvedValue({
      unsubscribe: mockUnsubscribe,
    })

    const unsubscribe = await watchContractShredEvent(mockClient, {
      abi: mockAbi,
      address: '0x123',
      eventName: 'Transfer',
      onLogs: mockOnLogs,
    })

    await new Promise((resolve) => setTimeout(resolve, 0))

    unsubscribe()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('should handle multiple addresses', async () => {
    const mockUnsubscribe = vi.fn()
    mockTransport.riseSubscribe.mockResolvedValue({
      unsubscribe: mockUnsubscribe,
    })

    await watchContractShredEvent(mockClient, {
      abi: mockAbi,
      address: ['0x123', '0x456'],
      eventName: 'Transfer',
      onLogs: mockOnLogs,
    })

    expect(mockTransport.riseSubscribe).toHaveBeenCalledWith({
      params: [
        'logs',
        { address: ['0x123', '0x456'], topics: expect.any(Array) },
      ],
      onData: expect.any(Function),
      onError: expect.any(Function),
    })
  })

  it('should throw error if no webSocket transport is available', async () => {
    const mockClientWithoutWS = {
      transport: {
        type: 'fallback',
        transports: [],
      },
    } as any

    await expect(
      watchContractShredEvent(mockClientWithoutWS, {
        abi: mockAbi,
        address: '0x123',
        eventName: 'Transfer',
        onLogs: mockOnLogs,
      })
    ).rejects.toThrow('A shredWebSocket transport is required')
  })
})
