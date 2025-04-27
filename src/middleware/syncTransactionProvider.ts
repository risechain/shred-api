import { JsonRpcProvider, TransactionReceipt } from "ethers";

/**
 * Extends the JsonRpcProvider to include the eth_sendRawTransactionSync method
 */
export class SyncTransactionProvider extends JsonRpcProvider {
  /**
   * Sends a raw transaction and waits for receipt in a single RPC call
   * 
   * @param signedTransaction - The signed transaction data as a hex string
   * @returns A promise that resolves to the transaction receipt
   */
  async sendRawTransactionSync(signedTransaction: string): Promise<TransactionReceipt> {
    // Make sure transaction is properly formatted as a hex string
    if (!signedTransaction.startsWith('0x')) {
      signedTransaction = '0x' + signedTransaction;
    }

    // Call the custom RPC method
    const receipt = await this.send('eth_sendRawTransactionSync', [signedTransaction]) as any;

    const ret: TransactionReceipt = {
      status: receipt.status,
      type: receipt.type,
      blockHash: receipt.blockHash,
      blockNumber: receipt.blockNumber,
      contractAddress: receipt.contractAddress,
      cumulativeGasUsed: receipt.cumulativeGasUsed,
      from: receipt.from,
      gasUsed: receipt.gasUsed,
      logs: receipt.logs,
      logsBloom: receipt.logsBloom,
      to: receipt.to,
      hash: receipt.transactionHash,
      index: receipt.transactionIndex,
      gasPrice: receipt.effectiveGasPrice,
      blobGasUsed: receipt.blobGasUsed,
      blobGasPrice: receipt.blobGasPrice,
      provider: this,
    } as any
    return ret
  }
}