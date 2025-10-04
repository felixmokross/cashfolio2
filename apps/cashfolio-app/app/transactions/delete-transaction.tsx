import { useState } from "react";
import { useAccountBook } from "~/account-books/use-account-book";
import {
  Alert,
  AlertActions,
  AlertDescription,
  AlertTitle,
} from "~/platform/alert";
import {
  CancelButton,
  DeleteButton,
  FormDialog,
} from "~/platform/forms/form-dialog";

export function useDeleteTransaction() {
  const [isOpen, setIsOpen] = useState(false);
  const [transactionId, setTransactionId] = useState<string>();

  function onDeleteTransaction(transactionId: string) {
    setTransactionId(transactionId);
    setIsOpen(true);
  }
  return {
    deleteTransactionProps: {
      isOpen,
      onClose: () => setIsOpen(false),
      transactionId,
    },
    onDeleteTransaction,
  };
}

export function DeleteTransaction({
  isOpen,
  onClose,
  transactionId,
}: {
  isOpen: boolean;
  onClose: () => void;
  transactionId?: string;
}) {
  const accountBook = useAccountBook();
  return (
    <FormDialog
      dialogComponent={Alert}
      open={isOpen}
      onClose={onClose}
      size="sm"
      action={`/${accountBook.id}/transactions/delete`}
    >
      <input type="hidden" name="transactionId" value={transactionId} />
      <AlertTitle>Are you sure you want to delete this transaction?</AlertTitle>
      <AlertDescription>
        This will delete the transaction and all its associated bookings.
      </AlertDescription>
      <AlertActions>
        <CancelButton />
        <DeleteButton />
      </AlertActions>
    </FormDialog>
  );
}
