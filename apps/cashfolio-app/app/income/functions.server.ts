import { prisma } from "~/prisma.server";
import type { Income } from "./types";
import {
  generateHoldingGainLossAccount,
  generateHoldingGainLossAccountGroups,
  getHoldingAccounts,
} from "./holding-gain-loss.server";
import { AccountType, type Account } from "~/.prisma-client/client";
import {
  getEquityAccountGroups,
  getEquityAccounts,
} from "./equity-account-income.server";
import { generateTransactionGainLossAccount } from "./transaction-gain-loss.server";
import { getCurrencyUnitInfo } from "~/units/functions";
import { getBalanceCached } from "~/accounts/detail/calculation.server";
import type { Decimal } from "@prisma/client-runtime-utils";
import { subDays } from "date-fns";

export async function getIncome(
  accountBookId: string,
  fromDate: Date,
  toDate: Date,
): Promise<Income> {
  const [accountBook, holdingAccounts] = await Promise.all([
    prisma.accountBook.findUniqueOrThrow({ where: { id: accountBookId } }),
    getHoldingAccounts(accountBookId),
  ]);

  const [accounts, accountGroups] = await Promise.all([
    getAccounts(accountBookId, fromDate, toDate, holdingAccounts),
    getAccountGroups(accountBookId, holdingAccounts),
  ]);

  const incomeByAccountId = new Map<string, Decimal>();

  await Promise.all(
    accounts.map(async (account) => {
      const balanceAtStart = await getBalanceCached(
        accountBook,
        account.id,
        getCurrencyUnitInfo(accountBook.referenceCurrency),
        subDays(fromDate, 1),
      );

      const balanceAtEnd = await getBalanceCached(
        accountBook,
        account.id,
        getCurrencyUnitInfo(accountBook.referenceCurrency),
        toDate,
      );

      incomeByAccountId.set(account.id, balanceAtEnd.sub(balanceAtStart));
    }),
  );

  return {
    incomeByAccountId,
    accounts,
    accountGroups,
  };
}

async function getAccounts(
  accountBookId: string,
  fromDate: Date,
  toDate: Date,
  holdingAccounts: Account[],
) {
  return [
    ...(await getEquityAccounts(accountBookId, fromDate, toDate)),
    generateTransactionGainLossAccount(
      await prisma.accountGroup.findFirstOrThrow({
        where: { accountBookId, type: AccountType.EQUITY, parentGroupId: null },
      }),
    ),
    ...holdingAccounts.map((a) => generateHoldingGainLossAccount(a)),
  ];
}

async function getAccountGroups(
  accountBookId: string,
  holdingAccounts: Account[],
) {
  return [
    ...(await getEquityAccountGroups(accountBookId)),
    ...(await generateHoldingGainLossAccountGroups(
      accountBookId,
      holdingAccounts,
    )),
  ];
}
