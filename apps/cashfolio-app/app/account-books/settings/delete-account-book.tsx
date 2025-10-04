import { useState } from "react";
import { Alert, AlertActions, AlertTitle } from "~/platform/alert";
import {
  CancelButton,
  DeleteButton,
  FormDialog,
} from "~/platform/forms/form-dialog";

export function useDeleteAccountBook() {
  const [isOpen, setAlertOpen] = useState(false);
  const [accountBookId, setAccountBookId] = useState<string>();

  function onDeleteAccountBook(accountId: string) {
    setAccountBookId(accountId);
    setAlertOpen(true);
  }
  return {
    deleteAccountBookProps: {
      isOpen,
      onClose: () => setAlertOpen(false),
      accountBookId,
    },
    onDeleteAccountBook,
  };
}

export function DeleteAccountBook({
  isOpen,
  onClose,
  accountBookId,
}: {
  isOpen: boolean;
  onClose: () => void;
  accountBookId?: string;
}) {
  return (
    <FormDialog
      dialogComponent={Alert}
      open={isOpen}
      onClose={onClose}
      size="md"
      action="/account-books/delete"
    >
      <input type="hidden" name="_action" value="delete" />
      <input type="hidden" name="accountBookId" value={accountBookId} />
      <AlertTitle>
        Are you sure you want to delete this account book?
      </AlertTitle>
      <AlertActions>
        <CancelButton />
        <DeleteButton />
      </AlertActions>
    </FormDialog>
  );
}
