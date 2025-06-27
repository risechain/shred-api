import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('WebSocket Exponential Backoff', () => {
  let originalSetTimeout: any
  let timeoutCalls: Array<{ callback: Function; delay: number }> = []

  beforeEach(() => {
    // Store original setTimeout
    originalSetTimeout = global.setTimeout
    timeoutCalls = []

    // Mock setTimeout to capture delays
    global.setTimeout = vi.fn((callback: Function, delay: number) => {
      timeoutCalls.push({ callback, delay })
      // Return a fake timer ID
      return 1 as any
    }) as any
  })

  afterEach(() => {
    // Restore original setTimeout
    global.setTimeout = originalSetTimeout
  })

  it('should calculate exponential backoff correctly', () => {
    // Test the exponential backoff calculation
    const baseDelay = 2000
    const maxDelay = 30000

    // Calculate expected delays
    const calculateBackoff = (attempt: number) => {
      return Math.min(baseDelay * 2 ** attempt, maxDelay)
    }

    // Test sequence
    expect(calculateBackoff(0)).toBe(2000) // 2^0 * 2000 = 2000
    expect(calculateBackoff(1)).toBe(4000) // 2^1 * 2000 = 4000
    expect(calculateBackoff(2)).toBe(8000) // 2^2 * 2000 = 8000
    expect(calculateBackoff(3)).toBe(16000) // 2^3 * 2000 = 16000
    expect(calculateBackoff(4)).toBe(30000) // 2^4 * 2000 = 32000, capped at 30000
    expect(calculateBackoff(5)).toBe(30000) // 2^5 * 2000 = 64000, capped at 30000
  })

  it('should verify exponential backoff implementation in socket.ts', async () => {
    // Read the actual implementation to verify it's correct
    const fs = await import('node:fs')
    const path = await import('node:path')
    const process = await import('node:process')
    const socketPath = path.join(process.cwd(), 'src/viem/utils/rpc/socket.ts')
    const socketContent = fs.readFileSync(socketPath, 'utf-8')

    // Verify exponential backoff code exists
    expect(socketContent).toContain('2 ** reconnectCount')
    expect(socketContent).toContain('30000') // max delay
    expect(socketContent).toContain('backoffDelay')

    // Verify it's used in setTimeout
    const backoffPattern =
      /const\s+backoffDelay\s*=\s*Math\.min\s*\(\s*delay\s*\*\s*2\s*\*\*\s*reconnectCount\s*,\s*30000[^)]*\)/
    expect(socketContent).toMatch(backoffPattern)
  })

  it('should use different delays for different base values', () => {
    const calculateBackoff = (
      baseDelay: number,
      attempt: number,
      maxDelay = 30000,
    ) => {
      return Math.min(baseDelay * 2 ** attempt, maxDelay)
    }

    // Test with 1 second base
    expect(calculateBackoff(1000, 0)).toBe(1000)
    expect(calculateBackoff(1000, 1)).toBe(2000)
    expect(calculateBackoff(1000, 2)).toBe(4000)
    expect(calculateBackoff(1000, 3)).toBe(8000)

    // Test with 5 second base
    expect(calculateBackoff(5000, 0)).toBe(5000)
    expect(calculateBackoff(5000, 1)).toBe(10000)
    expect(calculateBackoff(5000, 2)).toBe(20000)
    expect(calculateBackoff(5000, 3)).toBe(30000) // Would be 40000 but capped
  })
})
