import { sum } from "~/utils.server";
import type { IncomeAccountsNode } from "./types";
import {
  getAccountsTree,
  type AccountsNode,
} from "~/account-groups/accounts-tree";
import { Decimal } from "@prisma/client/runtime/library";
import { getIncome } from "./functions.server";

export async function getIncomeStatement(
  accountBookId: string,
  fromDate: Date,
  toDate: Date,
) {
  const incomeData = await getIncome(accountBookId, fromDate, toDate);

  const equityRootNode = getAccountsTree(
    incomeData.accounts,
    incomeData.accountGroups,
  ).EQUITY;

  if (!equityRootNode) {
    throw new Error("No equity account group found");
  }

  const netIncomeNode = { ...equityRootNode, name: "Net Income" };

  function withIncomeData(node: AccountsNode): IncomeAccountsNode {
    if (node.nodeType === "accountGroup") {
      const children = node.children
        .map(withIncomeData)
        .filter((child) => !child.value.isZero())

        .toSorted((a, b) => b.value.minus(a.value).toNumber())
        .toSorted(
          (a, b) =>
            (a.nodeType === "accountGroup" && a.sortOrder != null
              ? a.sortOrder
              : Infinity) -
            (b.nodeType === "accountGroup" && b.sortOrder != null
              ? b.sortOrder
              : Infinity),
        );
      return { ...node, children, value: sum(children.map((c) => c.value)) };
    }

    return {
      ...node,
      value: (
        incomeData.incomeByAccountId.get(node.id) ?? new Decimal(0)
      ).negated(),
    };
  }

  return withIncomeData(netIncomeNode);
}
