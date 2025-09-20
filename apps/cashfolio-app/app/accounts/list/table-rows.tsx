import { PencilSquareIcon, TrashIcon } from "~/platform/icons/standard";
import type { Account, AccountGroup } from "@prisma/client";
import type { AccountsNode } from "~/account-groups/accounts-tree";
import { AccountsNodeChildrenTableRows } from "~/account-groups/table-rows";
import { Button } from "~/platform/button";
import { TableCell } from "~/platform/table";
import type { Serialize } from "~/serialization";

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
          <TableCell>
            {node.nodeType === "account" ? node.unit : null}
          </TableCell>
          <TableCell>
            {node.nodeType === "account"
              ? node.unit === "CURRENCY"
                ? node.currency
                : node.unit === "CRYPTOCURRENCY"
                  ? node.cryptocurrency
                  : node.symbol
              : null}
          </TableCell>
          <TableCell>
            <div className="flex gap-2 items-center">
              <button
                className="z-10"
                onClick={() => {
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
