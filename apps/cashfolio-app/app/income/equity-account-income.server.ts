import { prisma } from "~/prisma.server";
import { AccountType } from "~/.prisma-client/enums";

export async function getEquityAccounts(
  accountBookId: string,
  fromDate: Date,
  toDate: Date,
) {
  return await prisma.account.findMany({
    where: {
      accountBookId,
      type: AccountType.EQUITY,
      bookings: { some: { date: { gte: fromDate, lte: toDate } } },
    },
  });
}

export async function getEquityAccountGroups(accountBookId: string) {
  return await prisma.accountGroup.findMany({
    // Currently we include all equity groups – to filter only relevant ones we'll need a open/close date, going through the group tree would be ineffecient
    where: { accountBookId, type: AccountType.EQUITY },
  });
}
