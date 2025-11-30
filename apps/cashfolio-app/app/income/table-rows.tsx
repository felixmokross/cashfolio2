import type { Serialize } from "~/serialization";
import { TableCell } from "~/platform/table";
import { formatMoney } from "~/formatting";
import {
  AccountsNodeChildrenTableRows,
  type AccountsNodeTableRowOptions,
} from "~/account-groups/table-rows";
import type { IncomeAccountsNode } from "~/income/types";

export function IncomeTableRows({
  node,
  options,
}: {
  node: Serialize<IncomeAccountsNode>;
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
            {formatMoney(node.value)}
          </TableCell>
        </>
      )}
    </AccountsNodeChildrenTableRows>
  );
}
