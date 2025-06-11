import type { ShredRpcSchema } from '../../types/rpcSchema'
import type {
  Account,
  Chain,
  Client,
  FormattedTransactionReceipt,
  TransactionSerializedGeneric,
  Transport,
} from 'viem'

/**
 * Parameters for {@link sendRawTransactionSync}.
 */
export type SendRawTransactionSyncParameters = {
  /** The serialized transaction to send. */
  serializedTransaction: TransactionSerializedGeneric
}

/**
 * Return type for {@link sendRawTransactionSync}.
 */
export type SendRawTransactionSyncReturnType<chain extends Chain | undefined> =
  FormattedTransactionReceipt<chain>

/**
 * Sends a raw transaction to the RISE network, where it is processed as a shred,
 * and waits for its real-time confirmation.
 *
 * @param client - Client to use.
 * @param parameters - {@link SendRawTransactionSyncParameters}
 * @returns The transaction hash. {@link SendRawTransactionSyncReturnType}
 */
export function sendRawTransactionSync<
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
