import { Button } from "~/platform/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogTitle,
} from "~/platform/dialog";
import { Field, FieldGroup } from "~/platform/forms/fieldset";
import { Input } from "~/platform/forms/input";
import type { AccountOption } from "~/types";
import { AccountCombobox } from "~/accounts/account-combobox";
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
import type { Serialize } from "~/serialization";
import type { Booking } from "@prisma/client";
import { CurrencyCombobox } from "../components/currency-combobox";
import { formatISO } from "date-fns";
import type { TransactionWithBookings } from "~/transactions/types";

type BookingFormValues = Serialize<
  Pick<Booking, "id" | "date" | "description" | "accountId" | "currency">
> & { value: string; isAccountLocked?: true };

export function useEditTransaction({
  accounts,
  returnToAccountId,
}: {
  accounts: AccountOption[];
  returnToAccountId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [transaction, setTransaction] =
    useState<Serialize<TransactionWithBookings>>();

  return {
    editTransactionProps: {
      key: transaction?.id ?? "new",
      isOpen,
      onClose: () => setIsOpen(false),
      accounts,
      returnToAccountId,
      transaction,
    },
    onNewTransaction: () => {
      setTransaction(undefined);
      setIsOpen(true);
    },
    onEditTransaction: (transaction: Serialize<TransactionWithBookings>) => {
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
}: {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountOption[];
  returnToAccountId: string;
  transaction?: Serialize<TransactionWithBookings>;
}) {
  return (
    <Dialog size="5xl" open={isOpen} onClose={onClose}>
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
              returnToAccountId={returnToAccountId}
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
  returnToAccountId,
}: {
  transaction?: Serialize<TransactionWithBookings>;
  accounts: AccountOption[];
  returnToAccountId: string;
}) {
  const [bookings, setBookings] = useState<BookingFormValues[]>(
    transaction
      ? transaction.bookings.map((b) => ({
          ...b,
          date: formatISO(b.date, { representation: "date" }),
          value: b.value.toString(),
        }))
      : addNewBooking(
          addNewBooking([], { lockedAccountId: returnToAccountId }),
        ),
  );
  return (
    <Table bleed className="[--gutter:--spacing(8)]">
      <TableHead>
        <TableRow>
          <TableHeader className="w-48">Date</TableHeader>
          <TableHeader>Account</TableHeader>
          <TableHeader>Description</TableHeader>
          <TableHeader className="w-28">Currency</TableHeader>
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
                disabled={booking.isAccountLocked}
                name={`bookings[${i}][accountId]`}
                accounts={accounts}
                defaultValue={booking.accountId}
              />
              {booking.isAccountLocked && (
                <input
                  type="hidden"
                  name={`bookings[${i}][accountId]`}
                  value={booking.accountId}
                />
              )}
            </TableCell>
            <TableCell>
              <Input
                name={`bookings[${i}][description]`}
                type="text"
                defaultValue={booking.description}
              />
            </TableCell>
            <TableCell>
              <CurrencyCombobox
                name={`bookings[${i}][currency]`}
                defaultValue={booking.currency}
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
                disabled={bookings.length <= 2 || booking.isAccountLocked}
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

function addNewBooking(
  bookings: BookingFormValues[],
  { lockedAccountId }: { lockedAccountId?: string } = {},
) {
  return [
    ...bookings,
    {
      id: createId(),
      date:
        bookings[bookings.length - 1]?.date ??
        formatISO(new Date(), { representation: "date" }),
      description: "",
      currency: "",
      accountId: lockedAccountId ?? "",
      isAccountLocked: !!lockedAccountId,
      value: "",
    } as BookingFormValues,
  ];
}
