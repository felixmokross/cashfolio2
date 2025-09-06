import { Button } from "~/platform/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "~/platform/dialog";
import { Field, FieldGroup, Label } from "~/platform/fieldset";
import { Subheading } from "~/platform/heading";
import { Input } from "~/platform/input";
import type { AccountOption } from "~/types";
import { AccountCombobox } from "./account-combobox";

export function TransactionDialog({
  isOpen,
  onClose,
  accounts,
}: {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountOption[];
}) {
  return (
    <Dialog size="4xl" open={isOpen} onClose={onClose}>
      <DialogTitle>New Transaction</DialogTitle>
      <DialogBody>
        <FieldGroup>
          <Field>
            <Input type="text" placeholder="General description" />
          </Field>
          <div className="flex flex-col gap-4">
            <Subheading>Bookings</Subheading>
            <div className="flex gap-2">
              <Input type="text" placeholder="YYYY-MM-DD" />
              <AccountCombobox accounts={accounts} placeholder="Account" />
              <Input type="text" placeholder="Description" />
              <Input type="number" placeholder="Value" />
            </div>
            <div className="flex gap-2">
              <Input type="text" placeholder="YYYY-MM-DD" />
              <AccountCombobox accounts={accounts} placeholder="Account" />
              <Input type="text" placeholder="Description" />
              <Input type="number" placeholder="Value" />
            </div>
          </div>
        </FieldGroup>
      </DialogBody>
      <DialogActions>
        <Button hierarchy="tertiary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onClose}>Create</Button>
      </DialogActions>
    </Dialog>
  );
}
