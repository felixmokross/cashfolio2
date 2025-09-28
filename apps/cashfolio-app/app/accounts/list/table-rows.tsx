import { PencilSquareIcon, TrashIcon } from "~/platform/icons/standard";
import type { Account, AccountGroup } from "@prisma/client";
import type { AccountsNode } from "~/account-groups/accounts-tree";
import { AccountsNodeChildrenTableRows } from "~/account-groups/table-rows";
import { TableCell } from "~/platform/table";
import type { Serialize } from "~/serialization";
import { Badge } from "~/platform/badge";

export function AccountsTableRows({
  node,
  onEditAccount,
  onEditAccountGroup,
  onDeleteAccount,
  onDeleteAccountGroup,
}: {
  node: Serialize<AccountsNode>;
  onEditAccount: (account: Serialize<Account>) => void;
  onEditAccountGroup: (accountGroup: Serialize<AccountGroup>) => void;
  onDeleteAccount: (accountId: string) => void;
  onDeleteAccountGroup: (accountGroupId: string) => void;
}) {
  return (
    <AccountsNodeChildrenTableRows node={node} viewPrefix="accounts-list">
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
            <div className="flex gap-2 items-center">
              <button
                className="z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  if (node.nodeType === "account") {
                    onEditAccount(node);
                  } else {
                    onEditAccountGroup(node);
                  }
                }}
              >
                <PencilSquareIcon className="size-4" />
              </button>
              <button
                type="submit"
                className="z-10"
                onClick={() => {
                  if (node.nodeType === "accountGroup") {
                    onDeleteAccountGroup(node.id);
                  } else {
                    onDeleteAccount(node.id);
                  }
                }}
              >
                <TrashIcon className="size-4" />
              </button>
            </div>
          </TableCell>
        </>
      )}
    </AccountsNodeChildrenTableRows>
  );
}
