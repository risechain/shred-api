import { beforeEach, describe, expect, it, vi } from 'vitest'
import { watchShreds } from '../../../../src/viem/actions/shred/watchShreds'
import type { ShredsWebSocketTransport } from '../../../../src/viem/clients/transports/shredsWebSocket'
import type { Chain, Client } from 'viem'

// Mock the formatShred utility
vi.mock('../../../../src/viem/utils/formatters/shred', () => ({
  formatShred: vi.fn((shred) => ({
    ...shred,
    formatted: true,
  })),
}))

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

describe('watchShreds', () => {
  let mockTransport: ReturnType<typeof createMockTransport>
  let mockClient: Client<ShredsWebSocketTransport, Chain>
  let mockOnShred: ReturnType<typeof vi.fn>
  let mockOnError: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockTransport = createMockTransport()
    mockClient = createMockClient(mockTransport)
    mockOnShred = vi.fn()
    mockOnError = vi.fn()
    vi.clearAllMocks()
  })

  it('should subscribe to shreds and call onShred', () => {
    const mockUnsubscribe = vi.fn()
    mockTransport.riseSubscribe.mockResolvedValue({
      unsubscribe: mockUnsubscribe,
    })

    const unsubscribe = watchShreds(mockClient, {
      onShred: mockOnShred,
    })

    expect(mockTransport.riseSubscribe).toHaveBeenCalledWith({
      params: [],
      onData: expect.any(Function),
      onError: expect.any(Function),
    })

    expect(typeof unsubscribe).toBe('function')
  })

  it('should handle shred data and format it', async () => {
    const mockUnsubscribe = vi.fn()
    let onDataCallback: (data: any) => void

    mockTransport.riseSubscribe.mockImplementation(({ onData }) => {
      onDataCallback = onData
      return Promise.resolve({ unsubscribe: mockUnsubscribe })
    })

    watchShreds(mockClient, {
      onShred: mockOnShred,
    })

    // Wait for subscription to be set up
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Simulate receiving shred data
    const mockShredData = {
      result: {
        hash: '0x123',
        blockNumber: '0x1',
        transactionIndex: '0x0',
        from: '0xabc',
        to: '0xdef',
        value: '0x1000',
        gas: '0x5208',
        gasPrice: '0x3b9aca00',
        input: '0x',
        nonce: '0x1',
        v: '0x1c',
        r: '0x456',
        s: '0x789',
      },
    }

    onDataCallback!(mockShredData)

    expect(mockOnShred).toHaveBeenCalledWith({
      hash: '0x123',
      blockNumber: '0x1',
      transactionIndex: '0x0',
      from: '0xabc',
      to: '0xdef',
      value: '0x1000',
      gas: '0x5208',
      gasPrice: '0x3b9aca00',
      input: '0x',
      nonce: '0x1',
      v: '0x1c',
      r: '0x456',
      s: '0x789',
      formatted: true,
    })
  })

  it('should handle errors during subscription', async () => {
    const error = new Error('Subscription failed')
    mockTransport.riseSubscribe.mockRejectedValue(error)

    watchShreds(mockClient, {
      onShred: mockOnShred,
      onError: mockOnError,
    })

    // Wait for error to be handled
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(mockOnError).toHaveBeenCalledWith(error)
  })

  it('should handle errors from transport onError callback', async () => {
    const mockUnsubscribe = vi.fn()
    let onErrorCallback: (error: Error) => void

    mockTransport.riseSubscribe.mockImplementation(({ onError }) => {
      onErrorCallback = onError
      return Promise.resolve({ unsubscribe: mockUnsubscribe })
    })

    watchShreds(mockClient, {
      onShred: mockOnShred,
      onError: mockOnError,
    })

    await new Promise((resolve) => setTimeout(resolve, 0))

    const error = new Error('Transport error')
    onErrorCallback!(error)

    expect(mockOnError).toHaveBeenCalledWith(error)
  })

  it('should unsubscribe when returned function is called', async () => {
    const mockUnsubscribe = vi.fn()
    mockTransport.riseSubscribe.mockResolvedValue({
      unsubscribe: mockUnsubscribe,
    })

    const unsubscribe = watchShreds(mockClient, {
      onShred: mockOnShred,
    })

    await new Promise((resolve) => setTimeout(resolve, 0))

    unsubscribe()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('should work without onError callback', async () => {
    const mockUnsubscribe = vi.fn()
    let onDataCallback: (data: any) => void

    mockTransport.riseSubscribe.mockImplementation(({ onData }) => {
      onDataCallback = onData
      return Promise.resolve({ unsubscribe: mockUnsubscribe })
    })

    watchShreds(mockClient, {
      onShred: mockOnShred,
    })

    await new Promise((resolve) => setTimeout(resolve, 0))

    const mockShredData = {
      result: {
        hash: '0x123',
        blockNumber: '0x1',
      },
    }

    // Should not throw even without onError
    expect(() => onDataCallback!(mockShredData)).not.toThrow()
    expect(mockOnShred).toHaveBeenCalled()
  })

  it('should throw error if no webSocket transport is available', () => {
    const mockClientWithoutWS = {
      transport: {
        type: 'fallback',
        transports: [],
      },
    } as any

    expect(() => {
      watchShreds(mockClientWithoutWS, {
        onShred: mockOnShred,
      })
    }).toThrow('A shredWebSocket transport is required')
  })

  it('should handle fallback transport with webSocket', () => {
    const mockUnsubscribe = vi.fn()
    const mockFallbackTransport = {
      type: 'fallback',
      transports: [
        {
          config: { type: 'webSocket' },
          value: {
            riseSubscribe: vi.fn().mockResolvedValue({
              unsubscribe: mockUnsubscribe,
            }),
          },
        },
      ],
    }

    const mockClientWithFallback = {
      transport: mockFallbackTransport,
    } as any

    const unsubscribe = watchShreds(mockClientWithFallback, {
      onShred: mockOnShred,
    })

    expect(typeof unsubscribe).toBe('function')
  })

  it('should handle multiple shreds in sequence', async () => {
    const mockUnsubscribe = vi.fn()
    let onDataCallback: (data: any) => void

    mockTransport.riseSubscribe.mockImplementation(({ onData }) => {
      onDataCallback = onData
      return Promise.resolve({ unsubscribe: mockUnsubscribe })
    })

    watchShreds(mockClient, {
      onShred: mockOnShred,
    })

    await new Promise((resolve) => setTimeout(resolve, 0))

    // Simulate receiving multiple shreds
    const shred1 = { result: { hash: '0x123', blockNumber: '0x1' } }
    const shred2 = { result: { hash: '0x456', blockNumber: '0x2' } }

    onDataCallback!(shred1)
    onDataCallback!(shred2)

    expect(mockOnShred).toHaveBeenCalledTimes(2)
    expect(mockOnShred).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        hash: '0x123',
        formatted: true,
      }),
    )
    expect(mockOnShred).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        hash: '0x456',
        formatted: true,
      }),
    )
  })

  it('should not call onShred after unsubscribe', async () => {
    const mockUnsubscribe = vi.fn()
    let onDataCallback: (data: any) => void
    let active = true

    mockTransport.riseSubscribe.mockImplementation(({ onData }) => {
      onDataCallback = (data: any) => {
        if (active) {
          onData(data)
        }
      }
      return Promise.resolve({
        unsubscribe: () => {
          active = false
          mockUnsubscribe()
        },
      })
    })

    const unsubscribe = watchShreds(mockClient, {
      onShred: mockOnShred,
    })

    await new Promise((resolve) => setTimeout(resolve, 0))

    // Unsubscribe first
    unsubscribe()

    // Try to send data after unsubscribe
    const mockShredData = { result: { hash: '0x123' } }
    onDataCallback!(mockShredData)

    // Should not call onShred after unsubscribe
    expect(mockOnShred).not.toHaveBeenCalled()
  })
})
