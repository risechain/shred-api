import { http } from 'viem'

/**
 * Creates an HTTP transport with sync transaction support
 */
export function syncTransport(url: string) {
  return http(url)
}