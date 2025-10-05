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
import { ChevronDoubleLeftIcon } from "~/platform/icons/standard";
import { AccountList } from "../account-list";

export function Page({
  loaderData: { tree, accountGroups },
}: {
  loaderData: LoaderData;
}) {
  const { editAccountGroupProps, onEditAccountGroup } = useEditAccountGroup();

  const { deleteAccountGroupProps, onDeleteAccountGroup } =
    useDeleteAccountGroup();

  return (
    <div>
      <div className="flex justify-between items-center gap-4">
        <Heading>Inactive Accounts</Heading>
        <div className="flex gap-4">
          <Button hierarchy="tertiary" href="..">
            <ChevronDoubleLeftIcon />
            Back to Active Accounts
          </Button>
        </div>
      </div>
      <EditAccountGroup
        {...editAccountGroupProps}
        accountGroups={accountGroups}
      />
      <DeleteAccountGroup {...deleteAccountGroupProps} />
      <AccountList
        tree={tree}
        onEditAccountGroup={onEditAccountGroup}
        onDeleteAccountGroup={onDeleteAccountGroup}
      />
    </div>
  );
}
