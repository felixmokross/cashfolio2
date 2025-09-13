import type { Serialize } from "~/serialization";
import { TableCell } from "~/platform/table";
import { formatMoney } from "~/formatting";
import type { BalancesAccountsNode } from "./types";
import { AccountsNodeChildrenTableRows } from "~/account-groups/table-rows";

export function BalancesTableRows({
  node,
  negated,
}: {
  node: Serialize<BalancesAccountsNode>;
  negated?: boolean;
}) {
  return (
    <AccountsNodeChildrenTableRows node={node}>
      {(node) => (
        <>
          <TableCell className="text-right">
            {node.nodeType === "account" &&
              !!node.balanceInOriginalCurrency && (
                <>
                  {node.currency}{" "}
                  {formatMoney(
                    negated
                      ? -node.balanceInOriginalCurrency!
                      : node.balanceInOriginalCurrency!,
                  )}
                </>
              )}
          </TableCell>
          <TableCell className="text-right">
            {formatMoney(negated ? -node.balance : node.balance)}
          </TableCell>
        </>
      )}
    </AccountsNodeChildrenTableRows>
  );
}
