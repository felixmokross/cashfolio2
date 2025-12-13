import type { Serialize } from "~/serialization";
import { TableCell } from "~/platform/table";
import { formatMoney } from "~/formatting";
import {
  AccountsNodeChildrenTableRows,
  type AccountsNodeTableRowOptions,
} from "~/account-groups/table-rows";
import type { AccountsNode } from "~/account-groups/accounts-tree";

export function IncomeTableRows({
  node,
  incomeByNodeId,
  options,
}: {
  node: Serialize<AccountsNode>;
  incomeByNodeId: Record<string, number>;
  options?: AccountsNodeTableRowOptions;
}) {
  return (
    <AccountsNodeChildrenTableRows
      node={node}
      viewPrefix="income"
      options={options}
    >
      {(node) => (
        <>
          <TableCell className="text-right">
            {formatMoney(incomeByNodeId[node.id] ?? 0)}
          </TableCell>
        </>
      )}
    </AccountsNodeChildrenTableRows>
  );
}
