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
  type Transport,
} from 'viem'
import type { ShredRpcSchema } from '../types/rpcSchema'
import { shredActions, type ShredActions } from './decorators/shred'

export type PublicShredClient<
  transport extends Transport = Transport,
  chain extends Chain | undefined = Chain | undefined,
  accountOrAddress extends Account | undefined = undefined,
  rpcSchema extends RpcSchema | undefined = undefined,
> = Prettify<
  Client<
    transport,
    chain,
    accountOrAddress,
    rpcSchema extends RpcSchema
      ? [...PublicRpcSchema, ...ShredRpcSchema, ...rpcSchema]
      : [...PublicRpcSchema, ...ShredRpcSchema],
    PublicActions<transport, chain> & ShredActions
  >
>

export function createPublicShredClient<
  transport extends Transport,
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
