import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sendRawTransactionSync } from '../../../../src/viem/actions/shred/sendRawTransactionSync'
import type { ShredRpcSchema } from '../../../../src/viem/types/rpcSchema'
import type { Account, Chain, Client, Transport } from 'viem'

// Mock client type
type MockClient = Client<Transport, Chain, Account, ShredRpcSchema>

describe('sendRawTransactionSync', () => {
  let mockClient: MockClient

  beforeEach(() => {
    mockClient = {
      request: vi.fn(),
    } as unknown as MockClient
  })

  it('should send raw transaction and return receipt', async () => {
    const mockReceipt = {
      transactionHash: '0x123',
      blockNumber: 1n,
      status: 'success',
    }

    vi.mocked(mockClient.request).mockResolvedValue(mockReceipt)

    const serializedTransaction = '0xabcdef123456'
    const result = await sendRawTransactionSync(mockClient, {
      serializedTransaction,
    })

    expect(mockClient.request).toHaveBeenCalledWith(
      {
        method: 'eth_sendRawTransactionSync',
        params: [serializedTransaction],
      },
      { retryCount: 0 },
    )
    expect(result).toEqual(mockReceipt)
  })

  it('should handle different serialized transaction formats', async () => {
    const mockReceipt = {
      transactionHash: '0x456',
      blockNumber: 2n,
      status: 'success',
    }

    vi.mocked(mockClient.request).mockResolvedValue(mockReceipt)

    const serializedTransaction =
      '0x02f86c0180843b9aca00825208940000000000000000000000000000000000000000880de0b6b3a764000080c0'
    const result = await sendRawTransactionSync(mockClient, {
      serializedTransaction,
    })

    expect(mockClient.request).toHaveBeenCalledWith(
      {
        method: 'eth_sendRawTransactionSync',
        params: [serializedTransaction],
      },
      { retryCount: 0 },
    )
    expect(result).toEqual(mockReceipt)
  })

  it('should propagate errors from client request', async () => {
    const error = new Error('Transaction failed')
    vi.mocked(mockClient.request).mockRejectedValue(error)

    const serializedTransaction = '0xbadtransaction'

    await expect(
      sendRawTransactionSync(mockClient, { serializedTransaction }),
    ).rejects.toThrow('Transaction failed')

    expect(mockClient.request).toHaveBeenCalledWith(
      {
        method: 'eth_sendRawTransactionSync',
        params: [serializedTransaction],
      },
      { retryCount: 0 },
    )
  })

  it('should use retryCount of 0', async () => {
    const mockReceipt = { transactionHash: '0x789' }
    vi.mocked(mockClient.request).mockResolvedValue(mockReceipt)

    await sendRawTransactionSync(mockClient, {
      serializedTransaction: '0x123',
    })

    expect(mockClient.request).toHaveBeenCalledWith(expect.any(Object), {
      retryCount: 0,
    })
  })
})
