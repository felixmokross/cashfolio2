export function getAccountBalanceCacheKey(
  accountBookId: string,
  accountId: string,
) {
  return `account-book:${accountBookId}:account:${accountId}:balance`;
}

export function getHoldingGainLossAccountBalanceCacheKey(
  accountBookId: string,
  holdingAccountId: string,
) {
  return `account-book:${accountBookId}:account:holding-gain-loss-${holdingAccountId}:balance`;
}
