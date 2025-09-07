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
import { Form } from "react-router";
import { createId } from "@paralleldrive/cuid2";
import type { AccountGroup } from "@prisma/client";

type BookingFormValues = {
  id: string;
  date: string;
  description: string;
  accountId: string;
  value: string;
};

export function useEditTransaction({
  accounts,
  returnToAccountId,
  accountGroups,
}: {
  accounts: AccountOption[];
  accountGroups: AccountGroup[];
  returnToAccountId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [transaction, setTransaction] = useState<TransactionWithBookings>();

  return {
    editTransactionProps: {
      isOpen,
      onClose: () => setIsOpen(false),
      accounts,
      accountGroups,
      returnToAccountId,
      transaction,
    },
    onNewTransaction: () => {
      setTransaction(undefined);
      setIsOpen(true);
    },
    onEditTransaction: (transaction: TransactionWithBookings) => {
      setTransaction(transaction);
      setIsOpen(true);
    },
  };
}

export function EditTransaction({
  isOpen,
  onClose,
  accounts,
  returnToAccountId,
  transaction,
  accountGroups,
}: {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountOption[];
  returnToAccountId: string;
  transaction?: TransactionWithBookings;
  accountGroups: AccountGroup[];
}) {
  return (
    <Dialog size="5xl" open={isOpen} onClose={onClose} key={transaction?.id}>
      <Form
        className="contents"
        action="/transactions"
        method={transaction ? "PUT" : "POST"}
        onSubmit={() => onClose()}
      >
        <input
          type="hidden"
          name="returnToAccountId"
          value={returnToAccountId}
        />
        <input type="hidden" name="transactionId" value={transaction?.id} />
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
            <BookingsTable
              transaction={transaction}
              accounts={accounts}
              accountGroups={accountGroups}
            />
          </FieldGroup>
        </DialogBody>
        <DialogActions>
          <Button hierarchy="tertiary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{transaction ? "Save" : "Create"}</Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}

function BookingsTable({
  transaction,
  accounts,
  accountGroups,
}: {
  transaction?: TransactionWithBookings;
  accounts: AccountOption[];
  accountGroups: AccountGroup[];
}) {
  const [bookings, setBookings] = useState<BookingFormValues[]>(
    transaction
      ? transaction.bookings.map((b) => ({
          id: b.id,
          date: b.date.toISOString().split("T")[0],
          description: b.description,
          accountId: b.accountId,
          value: b.value.toString(),
        }))
      : addNewBooking(addNewBooking([])),
  );
  return (
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
                        ? { ...b, date: d ? d.toString() : "" }
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
                defaultValue={booking.accountId}
                accountGroups={accountGroups}
              />
            </TableCell>
            <TableCell>
              <Input
                name={`bookings[${i}][description]`}
                type="text"
                defaultValue={booking.description}
              />
            </TableCell>
            <TableCell>
              <FormattedNumberInput
                name={`bookings[${i}][value]`}
                defaultValue={booking.value}
              />
            </TableCell>
            <TableCell>
              <Button
                hierarchy="tertiary"
                onClick={() =>
                  setBookings(bookings.filter((b) => b.id !== booking.id))
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
  );
}

function addNewBooking(bookings: BookingFormValues[]) {
  return [
    ...bookings,
    {
      id: createId(),
      date:
        bookings[bookings.length - 1]?.date ??
        new Date().toISOString().split("T")[0],
      description: "",
      accountId: "",
      value: "",
    } as BookingFormValues,
  ];
}
