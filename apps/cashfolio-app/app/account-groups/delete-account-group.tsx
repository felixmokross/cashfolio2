import { useState } from "react";
import { Alert, AlertActions, AlertTitle } from "~/platform/alert";
import {
  CancelButton,
  DeleteButton,
  FormDialog,
} from "~/platform/forms/form-dialog";

export function useDeleteAccountGroup() {
  const [isOpen, setAlertOpen] = useState(false);
  const [accountGroupId, setAccountGroupId] = useState<string>();

  function onDeleteAccountGroup(accountGroupId: string) {
    setAccountGroupId(accountGroupId);
    setAlertOpen(true);
  }
  return {
    deleteAccountGroupProps: {
      isOpen,
      onClose: () => setAlertOpen(false),
      accountGroupId,
    },
    onDeleteAccountGroup,
  };
}

export function DeleteAccountGroup({
  isOpen,
  onClose,
  accountGroupId,
}: {
  isOpen: boolean;
  onClose: () => void;
  accountGroupId?: string;
}) {
  return (
    <FormDialog
      dialogComponent={Alert}
      open={isOpen}
      onClose={onClose}
      size="md"
      action="/account-groups/delete"
    >
      <input type="hidden" name="accountGroupId" value={accountGroupId} />
      <AlertTitle>
        Are you sure you want to delete this account group?
      </AlertTitle>
      <AlertActions>
        <CancelButton />
        <DeleteButton />
      </AlertActions>
    </FormDialog>
  );
}
