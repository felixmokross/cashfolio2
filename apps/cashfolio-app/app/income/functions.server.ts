import { getHoldingGainLoss } from "./holding-gain-loss.server";
import type { Decimal } from "@prisma/client/runtime/library";
import { getEquityAccountIncome } from "./equity-account-income.server";
import { getTransactionGainLoss } from "./transaction-gain-loss.server";
import type { Income } from "./types";

export async function getIncome(
  accountBookId: string,
  fromDate: Date,
  toDate: Date,
): Promise<Income> {
  const equityIncome = await getEquityAccountIncome(
    accountBookId,
    fromDate,
    toDate,
  );

  const transactionGainLoss = await getTransactionGainLoss(
    accountBookId,
    fromDate,
    toDate,
  );

  const holdingGainLoss = await getHoldingGainLoss(
    accountBookId,
    fromDate,
    toDate,
  );

  return {
    accounts: mergeById(
      equityIncome.accounts,
      transactionGainLoss.accounts,
      holdingGainLoss.accounts,
    ),
    accountGroups: mergeById(
      equityIncome.accountGroups,
      transactionGainLoss.accountGroups,
      holdingGainLoss.accountGroups,
    ),
    incomeByAccountId: new Map<string, Decimal>([
      ...equityIncome.incomeByAccountId,
      ...transactionGainLoss.incomeByAccountId,
      ...holdingGainLoss.incomeByAccountId,
    ]),
  };
}

type Identifiable = { id: string };

function mergeById<T extends Identifiable>(...arrays: T[][]): T[] {
  const map = new Map<string, T>();
  for (const array of arrays) {
    for (const item of array) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}
