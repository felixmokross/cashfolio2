import { prisma } from "~/prisma.server";
import { AccountType } from "~/.prisma-client/enums";
import { getCurrencyUnitInfo } from "~/units/functions";
import { Decimal } from "@prisma/client/runtime/library";
import { getBalanceCached } from "~/accounts/detail/calculation.server";
import { subDays } from "date-fns";

export async function getEquityAccountIncome(
  accountBookId: string,
  fromDate: Date,
  toDate: Date,
): Promise<Map<string, Decimal>> {
  const accountBook = await prisma.accountBook.findUniqueOrThrow({
    where: { id: accountBookId },
    include: { accounts: { where: { type: AccountType.EQUITY } } },
  });

  const valueByAccountId = new Map<string, Decimal>();
  for (const account of accountBook.accounts) {
    const balanceAtEnd = await getBalanceCached(
      accountBookId,
      account.id,
      getCurrencyUnitInfo(accountBook.referenceCurrency),
      toDate,
    );

    const balanceAtStart = await getBalanceCached(
      accountBookId,
      account.id,
      getCurrencyUnitInfo(accountBook.referenceCurrency),
      subDays(fromDate, 1),
    );

    valueByAccountId.set(account.id, balanceAtEnd.sub(balanceAtStart));
  }
  return valueByAccountId;
}
