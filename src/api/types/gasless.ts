export interface GaslessSubmitTransferOptions {
  signedTrxTransaction: object;
  signedUsdtTransaction: object;
}

export interface GaslessSubmitTransferResult {
  txid: string;
}

export interface GaslessTransferInfo {
  address: string;
  fee: number;
  optimization: boolean;
}
