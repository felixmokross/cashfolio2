import type { Serialize } from "~/serialization";
import { TableCell } from "~/platform/table";
import { formatMoney } from "~/formatting";
import { AccountsNodeChildrenTableRows } from "~/account-groups/table-rows";
import type { IncomeAccountsNode } from "../types";

export function IncomeTableRows({
  node,
}: {
  node: Serialize<IncomeAccountsNode>;
}) {
  return (
    <AccountsNodeChildrenTableRows node={node} viewPrefix="income">
      {(node) => (
        <>
          <TableCell className="text-right">
            {formatMoney(node.value)}
          </TableCell>
        </>
      )}
    </AccountsNodeChildrenTableRows>
  );
}
