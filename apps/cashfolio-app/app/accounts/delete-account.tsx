import { useState } from "react";
import { Alert, AlertActions, AlertTitle } from "~/platform/alert";
import {
  CancelButton,
  DeleteButton,
  FormDialog,
} from "~/platform/forms/form-dialog";

export function useDeleteAccount() {
  const [isOpen, setAlertOpen] = useState(false);
  const [accountId, setAccountId] = useState<string>();

  function onDeleteAccount(accountId: string) {
    setAccountId(accountId);
    setAlertOpen(true);
  }
  return {
    deleteAccountProps: {
      key: accountId,
      isOpen,
      onClose: () => setAlertOpen(false),
      accountId,
    },
    onDeleteAccount,
  };
}

export function DeleteAccount({
  isOpen,
  onClose,
  accountId,
}: {
  isOpen: boolean;
  onClose: () => void;
  accountId?: string;
}) {
  return (
    <FormDialog
      dialogComponent={Alert}
      open={isOpen}
      onClose={onClose}
      size="sm"
      action="/accounts/delete"
    >
      <input type="hidden" name="_action" value="delete" />
      <input type="hidden" name="accountId" value={accountId} />
      <AlertTitle>Are you sure you want to delete this account?</AlertTitle>
      <AlertActions>
        <CancelButton />
        <DeleteButton />
      </AlertActions>
    </FormDialog>
  );
}
