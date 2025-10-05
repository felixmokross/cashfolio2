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
import { ArchiveBoxIcon, PlusCircleIcon } from "~/platform/icons/standard";
import { AccountList } from "../account-list";

export function Page({
  loaderData: { tree, accountGroups },
}: {
  loaderData: LoaderData;
}) {
  const { editAccountProps, onNewAccount } = useEditAccount();
  const { editAccountGroupProps, onNewAccountGroup, onEditAccountGroup } =
    useEditAccountGroup();

  const { deleteAccountGroupProps, onDeleteAccountGroup } =
    useDeleteAccountGroup();

  const { deleteAccountProps } = useDeleteAccount();

  return (
    <div>
      <div className="flex justify-between items-center gap-4">
        <Heading>Accounts</Heading>
        <div className="flex gap-4">
          <Button hierarchy="tertiary" href="./inactive">
            <ArchiveBoxIcon />
            Inactive Accounts
          </Button>
          <Button hierarchy="secondary" onClick={() => onNewAccount()}>
            <PlusCircleIcon />
            New Account
          </Button>
          <Button hierarchy="secondary" onClick={() => onNewAccountGroup()}>
            <PlusCircleIcon />
            New Group
          </Button>
        </div>
      </div>
      <EditAccount {...editAccountProps} accountGroups={accountGroups} />
      <EditAccountGroup
        {...editAccountGroupProps}
        accountGroups={accountGroups}
      />
      <DeleteAccount {...deleteAccountProps} />
      <DeleteAccountGroup {...deleteAccountGroupProps} />
      <AccountList
        tree={tree}
        onEditAccountGroup={onEditAccountGroup}
        onDeleteAccountGroup={onDeleteAccountGroup}
      />
    </div>
  );
}
