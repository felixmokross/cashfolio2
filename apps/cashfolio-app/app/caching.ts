export function getAccountBalanceCacheKey(
  accountBookId: string,
  accountId: string,
) {
  return `account-book:${accountBookId}:account:${accountId}:balance`;
}
