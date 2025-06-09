import type {
  Account,
  Chain,
  Client,
  FormattedTransactionReceipt,
  TransactionSerializedGeneric,
  Transport,
} from 'viem'
import type { ShredRpcSchema } from '../../types/rpcSchema'

export type SendRawTransactionSyncParameters = {
  serializedTransaction: TransactionSerializedGeneric
}

export type SendRawTransactionSyncReturnType<chain extends Chain | undefined> =
  FormattedTransactionReceipt<chain>

export async function sendRawTransactionSync<
  chain extends Chain | undefined,
  account extends Account | undefined = undefined,
>(
  client: Client<Transport, chain, account, ShredRpcSchema>,
  { serializedTransaction }: SendRawTransactionSyncParameters,
): Promise<SendRawTransactionSyncReturnType<chain>> {
  return client.request(
    {
      method: 'eth_sendRawTransactionSync',
      params: [serializedTransaction],
    },
    { retryCount: 0 },
  )
}
