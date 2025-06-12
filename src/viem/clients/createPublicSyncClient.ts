import {
  createPublicClient,
  type Account,
  type Chain,
  type Client,
  type ParseAccount,
  type Prettify,
  type PublicActions,
  type PublicClientConfig,
  type PublicRpcSchema,
  type RpcSchema,
} from 'viem'
import type { ShredRpcSchema } from '../types/rpcSchema'
import { syncActions, type SyncActions } from './decorators/sync'
import type { ShredsWebSocketTransport } from './transports/shredsWebSocket'

export type PublicSyncClient<
  transport extends ShredsWebSocketTransport = ShredsWebSocketTransport,
  chain extends Chain | undefined = Chain | undefined,
  accountOrAddress extends Account | undefined = undefined,
  rpcSchema extends RpcSchema | undefined = undefined,
> = Prettify<
  Client<
    transport,
    chain,
    accountOrAddress,
    rpcSchema extends RpcSchema
      ? [...PublicRpcSchema, ...rpcSchema, ...ShredRpcSchema]
      : [...PublicRpcSchema, ...ShredRpcSchema],
    PublicActions<transport, chain> & SyncActions<chain>
  >
>

export function createPublicSyncClient<
  transport extends ShredsWebSocketTransport,
  chain extends Chain | undefined = undefined,
  accountOrAddress extends Account | undefined = undefined,
  rpcSchema extends [...RpcSchema, ...ShredRpcSchema] | undefined = undefined,
>(
  parameters: PublicClientConfig<transport, chain, accountOrAddress, rpcSchema>,
): PublicSyncClient<
  transport,
  chain,
  ParseAccount<accountOrAddress>,
  rpcSchema
> {
  return createPublicClient({ ...parameters }).extend(syncActions) as any
}
