import { Button } from "~/platform/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogTitle,
} from "~/platform/dialog";
import { Field, FieldGroup } from "~/platform/forms/fieldset";
import { Input } from "~/platform/forms/input";
import type { AccountOption, TransactionWithBookings } from "~/types";
import { AccountCombobox } from "./account-combobox";
import { DateInput } from "~/platform/forms/date-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/platform/table";
import { FormattedNumberInput } from "~/platform/forms/formatted-number-input";
import { useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/16/solid";

type Booking = {
  id: number;
  date?: string;
};

export function useEditTransaction({
  accounts,
  returnToAccountId,
}: {
  accounts: AccountOption[];
  returnToAccountId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [transaction, setTransaction] = useState<TransactionWithBookings>();

  return {
    editTransactionProps: {
      isOpen,
      onClose: () => setIsOpen(false),
      accounts,
      returnToAccountId,
      transaction,
    },
    onNewTransaction: () => {
      setIsOpen(true);
      setTransaction(undefined);
    },
    onEditTransaction: (transaction: TransactionWithBookings) => {
      setIsOpen(true);
      setTransaction(transaction);
    },
  };
}

export function EditTransaction({
  isOpen,
  onClose,
  accounts,
  returnToAccountId,
  transaction,
}: {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountOption[];
  returnToAccountId: string;
  transaction?: TransactionWithBookings;
}) {
  const [bookings, setBookings] = useState<Booking[]>(
    transaction
      ? transaction.bookings.map((b, i) => ({
          id: i,
          date: b.date.toISOString().split("T")[0],
        }))
      : addNewBooking(addNewBooking([])),
  );
  console.log(transaction);
  return (
    <Dialog size="5xl" open={isOpen} onClose={onClose}>
      <form
        className="contents"
        action="/transactions"
        method="POST"
        onSubmit={() => onClose()}
      >
        <input
          type="hidden"
          name="returnToAccountId"
          value={returnToAccountId}
        />
        <DialogTitle>
          {transaction ? "Edit Transaction" : "New Transaction"}
        </DialogTitle>
        <DialogBody>
          <FieldGroup>
            <Field>
              <Input
                type="text"
                name="description"
                placeholder="Description"
                defaultValue={transaction?.description}
              />
            </Field>
            <div className="flex flex-col gap-4">
              <Table bleed className="[--gutter:--spacing(8)]">
                <TableHead>
                  <TableRow>
                    <TableHeader className="w-48">Date</TableHeader>
                    <TableHeader>Account</TableHeader>
                    <TableHeader>Description</TableHeader>
                    <TableHeader className="w-36">Value</TableHeader>
                    <TableHeader className="w-5">
                      <span className="sr-only">Actions</span>
                    </TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bookings.map((booking, i) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <DateInput
                          name={`bookings[${i}][date]`}
                          defaultValue={booking.date}
                          onChange={(d) => {
                            setBookings(
                              bookings.map((b) =>
                                b.id === booking.id
                                  ? { ...b, date: d ? d.toString() : undefined }
                                  : b,
                              ),
                            );
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <AccountCombobox
                          name={`bookings[${i}][accountId]`}
                          accounts={accounts}
                          defaultValue={transaction?.bookings[i].accountId}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          name={`bookings[${i}][description]`}
                          type="text"
                          defaultValue={transaction?.bookings[i].description}
                        />
                      </TableCell>
                      <TableCell>
                        <FormattedNumberInput
                          name={`bookings[${i}][value]`}
                          defaultValue={transaction?.bookings[
                            i
                          ].value.toString()}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          hierarchy="tertiary"
                          onClick={() =>
                            setBookings(
                              bookings.filter((b) => b.id !== booking.id),
                            )
                          }
                        >
                          <TrashIcon />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      <Button
                        type="button"
                        hierarchy="secondary"
                        onClick={() => setBookings(addNewBooking(bookings))}
                      >
                        <PlusIcon />
                        Add booking
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </FieldGroup>
        </DialogBody>
        <DialogActions>
          <Button hierarchy="tertiary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{transaction ? "Save" : "Create"}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function addNewBooking(bookings: Booking[]) {
  return [
    ...bookings,
    {
      id: bookings.length > 0 ? Math.max(...bookings.map((b) => b.id)) + 1 : 0,
      date:
        bookings[bookings.length - 1]?.date ??
        new Date().toISOString().split("T")[0],
    },
  ];
}
