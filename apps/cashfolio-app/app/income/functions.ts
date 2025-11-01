import type { AccountsNode } from "~/account-groups/accounts-tree";
import type { IncomeAccountsNode } from "./types";
import type { Serialize } from "~/serialization";
import { AccountType, EquityAccountSubtype } from "~/.prisma-client/enums";

export function findSubtreeRootNode<T extends AccountsNode>(
  node: T,
  nodeId: string,
): AccountsNode | undefined {
  if (node.id === nodeId) {
    return node;
  }

  if (node.nodeType === "accountGroup") {
    for (const child of node.children) {
      const result = findSubtreeRootNode(child as T, nodeId);
      if (result) {
        return result;
      }
    }
  }
}

export function isExpensesNode(node: Serialize<IncomeAccountsNode>): boolean {
  return node.nodeType === "accountGroup"
    ? node.children.every(isExpensesNode)
    : node.type === AccountType.EQUITY &&
        node.equityAccountSubtype === EquityAccountSubtype.EXPENSE;
}
