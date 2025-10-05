import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "~/platform/table";
import { AccountsTableRows } from "./account-table-rows";
import type { Serialize } from "~/serialization";
import type { AccountsNode } from "~/types";
import { useEditAccountGroup } from "~/account-groups/edit-account-group";
import { useDeleteAccountGroup } from "~/account-groups/delete-account-group";
import type { LoaderData } from "./list/route";

export function AccountList({
  tree,
  onEditAccountGroup,
  onDeleteAccountGroup,
  viewPrefix,
}: {
  tree: LoaderData["tree"];
  onEditAccountGroup: ReturnType<
    typeof useEditAccountGroup
  >["onEditAccountGroup"];
  onDeleteAccountGroup: ReturnType<
    typeof useDeleteAccountGroup
  >["onDeleteAccountGroup"];
  viewPrefix: string;
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
            onEditAccountGroup={onEditAccountGroup}
            onDeleteAccountGroup={onDeleteAccountGroup}
            viewPrefix={viewPrefix}
          />
        </TableBody>
      </Table>
    </>
  );
}
