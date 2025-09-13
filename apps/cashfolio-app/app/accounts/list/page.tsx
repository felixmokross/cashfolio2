import { EditAccount, useEditAccount } from "~/accounts/edit-account";
import type { LoaderData } from "./route";
import {
  EditAccountGroup,
  useEditAccountGroup,
} from "~/account-groups/edit-account-group";
import {
  DeleteAccountGroup,
  useDeleteAccountGroup,
} from "~/account-groups/delete-account-group";
import { DeleteAccount, useDeleteAccount } from "~/accounts/delete-account";
import { Heading } from "~/platform/heading";
import { Button } from "~/platform/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "~/platform/table";
import type { Serialize } from "~/serialization";
import { AccountsTableRows } from "./table-rows";
import type { AccountsNode } from "~/types";

export function Page({
  loaderData: { tree, accountGroups },
}: {
  loaderData: LoaderData;
}) {
  const { editAccountProps, onNewAccount, onEditAccount } = useEditAccount({
    accountGroups,
  });
  const { editAccountGroupProps, onNewAccountGroup, onEditAccountGroup } =
    useEditAccountGroup({ accountGroups });

  const { deleteAccountGroupProps, onDeleteAccountGroup } =
    useDeleteAccountGroup();

  const { deleteAccountProps, onDeleteAccount } = useDeleteAccount();

  return (
    <div>
      <div className="flex justify-between items-center">
        <Heading>Accounts</Heading>
        <div className="flex gap-4">
          <Button hierarchy="secondary" onClick={() => onNewAccount()}>
            New Account
          </Button>
          <Button hierarchy="secondary" onClick={() => onNewAccountGroup()}>
            New Group
          </Button>
        </div>
      </div>
      <EditAccount {...editAccountProps} />
      <EditAccountGroup {...editAccountGroupProps} />
      <DeleteAccount {...deleteAccountProps} />
      <DeleteAccountGroup {...deleteAccountGroupProps} />
      <Table
        bleed
        dense
        striped
        className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]"
      >
        <TableHead>
          <TableRow>
            <TableHeader>Name</TableHeader>
            <TableHeader>Unit</TableHeader>
            <TableHeader>Currency</TableHeader>
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
    </div>
  );
}
