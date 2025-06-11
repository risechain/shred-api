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
import { shredActions, type ShredActions } from './decorators/shred'
import type { ShredsWebSocketTransport } from './transports/shredsWebSocket'

export type PublicShredClient<
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
    PublicActions<transport, chain> & ShredActions<chain>
  >
>

export function createPublicShredClient<
  transport extends ShredsWebSocketTransport,
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
  return createPublicClient({ ...parameters }).extend(shredActions) as any
}
