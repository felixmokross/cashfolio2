import { PencilSquareIcon, TrashIcon } from "~/platform/icons/standard";
import type { AccountGroup } from "~/.prisma-client/client";
import type { AccountsNode } from "~/account-groups/accounts-tree";
import { AccountsNodeChildrenTableRows } from "~/account-groups/table-rows";
import { TableCell } from "~/platform/table";
import type { Serialize } from "~/serialization";
import { Badge } from "~/platform/badge";

export function AccountsTableRows({
  node,
  onEditAccountGroup,
  onDeleteAccountGroup,
  viewPrefix,
}: {
  node: Serialize<AccountsNode>;
  onEditAccountGroup: (accountGroup: Serialize<AccountGroup>) => void;
  onDeleteAccountGroup: (accountGroupId: string) => void;
  viewPrefix: string;
}) {
  return (
    <AccountsNodeChildrenTableRows
      node={node}
      viewPrefix={viewPrefix}
      options={{ showInactiveBadge: true }}
    >
      {(node) => (
        <>
          <TableCell className="w-40 space-x-2">
            {node.nodeType === "account" && (
              <>
                {node.unit === "CURRENCY" ? (
                  <Badge>{node.currency}</Badge>
                ) : node.unit === "CRYPTOCURRENCY" ? (
                  <Badge>{node.cryptocurrency}</Badge>
                ) : (
                  <>
                    <Badge>{node.symbol}</Badge>
                    <Badge>{node.tradeCurrency}</Badge>
                  </>
                )}
              </>
            )}
          </TableCell>
          <TableCell>
            {node.nodeType === "accountGroup" && (
              <div className="flex gap-2 items-center">
                <button
                  className="z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditAccountGroup(node);
                  }}
                >
                  <PencilSquareIcon className="size-4" />
                </button>
                <button
                  className="z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteAccountGroup(node.id);
                  }}
                >
                  <TrashIcon className="size-4" />
                </button>
              </div>
            )}
          </TableCell>
        </>
      )}
    </AccountsNodeChildrenTableRows>
  );
}
