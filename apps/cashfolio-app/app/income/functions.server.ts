import { getEquityAccountIncome } from "./equity-account-income.server";
import type { Income } from "./types";

export async function getIncome(
  accountBookId: string,
  fromDate: Date,
  toDate: Date,
): Promise<Income> {
  console.log("Calculating income...");
  let x = performance.now();
  const equityIncome = await getEquityAccountIncome(
    accountBookId,
    fromDate,
    toDate,
  );
  console.log(performance.now() - x, "Equity account income calculated");
  x = performance.now();

  return equityIncome;
}
