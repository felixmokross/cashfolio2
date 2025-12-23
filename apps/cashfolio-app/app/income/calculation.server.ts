import { sum } from "~/utils.server";
import type { Income } from "./types";
import { type AccountsNode } from "~/account-groups/accounts-tree";
import { Decimal } from "@prisma/client-runtime-utils";

export function getIncomeByNodeId(
  income: Income,
  equityRootNode: AccountsNode,
): Map<string, Decimal> {
  const incomeByNodeId = new Map<string, Decimal>();

  populateAccountGroupIncome(equityRootNode);

  return incomeByNodeId;

  function populateAccountGroupIncome(node: AccountsNode) {
    incomeByNodeId.set(
      node.id,
      node.nodeType === "account"
        ? (income.incomeByAccountId.get(node.id) ?? new Decimal(0))
        : sum(
            node.children.map((child) => {
              populateAccountGroupIncome(child);

              return incomeByNodeId.get(child.id) ?? new Decimal(0);
            }),
          ),
    );
  }
}
