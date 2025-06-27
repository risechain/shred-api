import {
  createPublicClient,
  type Account,
  type Chain,
  type Client,
  type FallbackTransport,
  type ParseAccount,
  type Prettify,
  type PublicActions,
  type PublicClientConfig,
  type PublicRpcSchema,
  type RpcSchema,
  type Transport,
} from 'viem'
import type { ShredRpcSchema } from '../types/rpcSchema'
import { shredActions, type ShredActions } from './decorators/shred'
import { connectionActions, type ConnectionActions } from './decorators/connection'
import { queueActions, type QueueActions } from './decorators/queue'
import type { ShredsWebSocketTransport } from './transports/shredsWebSocket'

export type PublicShredClient<
  transport extends
    | ShredsWebSocketTransport
    | FallbackTransport<readonly [ShredsWebSocketTransport, ...Transport[]]> =
    | ShredsWebSocketTransport
    | FallbackTransport<readonly [ShredsWebSocketTransport, ...Transport[]]>,
  chain extends Chain | undefined = Chain | undefined,
  accountOrAddress extends Account | undefined = undefined,
  rpcSchema extends RpcSchema | undefined = undefined,
> = Prettify<
  Client<
    transport,
    chain,
    accountOrAddress,
    rpcSchema extends RpcSchema
      ? [...PublicRpcSchema, ...rpcSchema]
      : PublicRpcSchema,
    PublicActions<transport, chain> & ShredActions & ConnectionActions & QueueActions
  >
>

export function createPublicShredClient<
  transport extends
    | ShredsWebSocketTransport
    | FallbackTransport<readonly [ShredsWebSocketTransport, ...Transport[]]>,
  chain extends Chain | undefined = undefined,
  accountOrAddress extends Account | undefined = undefined,
  rpcSchema extends [...RpcSchema, ...ShredRpcSchema] | undefined = undefined,
>(
  parameters: PublicClientConfig<transport, chain, accountOrAddress, rpcSchema>,
): PublicShredClient<
  transport,
  chain,
  ParseAccount<accountOrAddress>,
  rpcSchema
> {
  return createPublicClient({ ...parameters })
    .extend(shredActions)
    .extend(connectionActions)
    .extend(queueActions) as any
}
