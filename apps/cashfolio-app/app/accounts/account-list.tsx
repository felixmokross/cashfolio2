import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "~/platform/table";
import { AccountsTableRows } from "./list/table-rows";
import type { Serialize } from "~/serialization";
import type { AccountsNode } from "~/types";
import { useEditAccount } from "./edit-account";
import { useEditAccountGroup } from "~/account-groups/edit-account-group";
import { useDeleteAccountGroup } from "~/account-groups/delete-account-group";
import { useDeleteAccount } from "./delete-account";
import type { LoaderData } from "./list/route";

export function AccountList({
  tree,
  onEditAccount,
  onEditAccountGroup,
  onDeleteAccount,
  onDeleteAccountGroup,
}: {
  tree: LoaderData["tree"];
  onEditAccount: ReturnType<typeof useEditAccount>["onEditAccount"];
  onEditAccountGroup: ReturnType<
    typeof useEditAccountGroup
  >["onEditAccountGroup"];
  onDeleteAccount: ReturnType<typeof useDeleteAccount>["onDeleteAccount"];
  onDeleteAccountGroup: ReturnType<
    typeof useDeleteAccountGroup
  >["onDeleteAccountGroup"];
}) {
  return (
    <>
      <Table
        bleed
        dense
        striped
        className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]"
      >
        <TableHead>
          <TableRow>
            <TableHeader>Name</TableHeader>
            <TableHeader>Ccy./Symbol</TableHeader>
            <TableHeader className="w-10">
              <span className="sr-only">Actions</span>
            </TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          <AccountsTableRows
            node={
              {
                id: "root",
                nodeType: "accountGroup",
                children: [tree.ASSET, tree.LIABILITY, tree.EQUITY].filter(
                  (n) => !!n,
                ),
              } as Serialize<AccountsNode>
            }
            onEditAccount={onEditAccount}
            onEditAccountGroup={onEditAccountGroup}
            onDeleteAccount={onDeleteAccount}
            onDeleteAccountGroup={onDeleteAccountGroup}
          />
        </TableBody>
      </Table>
    </>
  );
}
