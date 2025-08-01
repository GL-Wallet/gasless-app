import type { ApiDappTransfer } from '../../api/types';
import type { GlobalState } from '../types';

import { TONCOIN } from '../../config';
import memoize from '../../util/memoize';
import { isNftTransferPayload, isTokenTransferPayload } from '../../util/ton/transfer';
import { selectCurrentAccountState } from './accounts';

const selectCurrentDappTransferTotalsMemoized = memoize((
  transactions: ApiDappTransfer[] | undefined,
) => {
  const amountsBySlug: Record<string, bigint> = {};
  const addSlugAmount = (tokenSlug: string, amount: bigint) => {
    amountsBySlug[tokenSlug] = (amountsBySlug[tokenSlug] ?? 0n) + amount;
  };

  let isScam = false;
  let isDangerous = false;
  let nftCount = 0;

  for (const transaction of transactions ?? []) {
    if (transaction.isScam) isScam = true;
    if (transaction.isDangerous) isDangerous = true;

    addSlugAmount(TONCOIN.slug, transaction.amount + transaction.networkFee);

    if (isTokenTransferPayload(transaction.payload)) {
      addSlugAmount(transaction.payload.slug, transaction.payload.amount);
    } else if (isNftTransferPayload(transaction.payload)) {
      nftCount++;
    }
  }

  return {
    amountsBySlug,
    isScam,
    isDangerous,
    nftCount,
  };
});

const selectDappTransferInsufficientTokensMemoized = memoize((
  amountsBySlug: Record<string, bigint>,
  balances: Record<string, bigint> | undefined,
  tokensBySlug: Record<string, any> | undefined,
): string | undefined => {
  if (!balances || !tokensBySlug) {
    return undefined;
  }

  const insufficientTokens: string[] = [];

  for (const [slug, requiredAmount] of Object.entries(amountsBySlug)) {
    const availableBalance = balances[slug] ?? 0n;

    if (availableBalance < requiredAmount) {
      const token = tokensBySlug[slug];
      const symbol = token?.symbol || slug;
      insufficientTokens.push(symbol);
    }
  }

  return insufficientTokens.length > 0 ? insufficientTokens.join(', ') : undefined;
});

export function selectCurrentDappTransferTotals(global: GlobalState) {
  const { transactions } = global.currentDappTransfer;
  return selectCurrentDappTransferTotalsMemoized(transactions);
}

export function selectDappTransferInsufficientTokens(global: GlobalState): string | undefined {
  const accountState = selectCurrentAccountState(global);
  const balances = accountState?.balances?.bySlug;
  const tokensBySlug = global.tokenInfo.bySlug;
  const { amountsBySlug } = selectCurrentDappTransferTotals(global);

  return selectDappTransferInsufficientTokensMemoized(amountsBySlug, balances, tokensBySlug);
}
