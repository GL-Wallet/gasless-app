import type { GaslessSubmitTransferOptions, GaslessSubmitTransferResult, GaslessTransferInfo } from '../types/gasless';

import { callGaslessGet, callGaslessPost } from '../common/gasless';

export function submitGaslessTransfer(options: GaslessSubmitTransferOptions): Promise<GaslessSubmitTransferResult> {
  return callGaslessPost('/transfer/1', options);
}

export function fetchGaslessTransferInfo(recipient: string): Promise<GaslessTransferInfo> {
  return callGaslessGet(`/transfer/info/${recipient}`);
}
