import { Button } from "~/platform/button";
import { DialogActions, DialogBody, DialogTitle } from "~/platform/dialog";
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
import { PlusIcon, TrashIcon } from "~/platform/icons/standard";
import { useFetcher } from "react-router";
import { createId } from "@paralleldrive/cuid2";
import type { Serialize } from "~/serialization";
import type { Booking } from "@prisma/client";
import { CurrencyCombobox } from "../components/currency-combobox";
import { formatISO } from "date-fns";
import type { TransactionWithBookings } from "~/transactions/types";
import { CryptocurrencyCombobox } from "~/components/cryptocurrency-combobox";
import type { action } from "./actions/create";
import {
  CancelButton,
  FormDialog,
  FormErrorMessage,
  CreateOrSaveButton,
} from "~/platform/forms/form-dialog";

type BookingFormValues = Serialize<
  Pick<
    Booking,
    | "id"
    | "date"
    | "description"
    | "accountId"
    | "currency"
    | "cryptocurrency"
    | "unit"
  >
> & { value: string; isAccountLocked?: true };

export function useEditTransaction() {
  const [isOpen, setIsOpen] = useState(false);
  const [transaction, setTransaction] =
    useState<Serialize<TransactionWithBookings>>();

  return {
    editTransactionProps: {
      isOpen,
      onClose: () => setIsOpen(false),
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
  transaction,
  lockedAccountId,
}: {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountOption[];
  transaction?: Serialize<TransactionWithBookings>;
  lockedAccountId: string;
}) {
  return (
    <FormDialog
      size="5xl"
      open={isOpen}
      onClose={onClose}
      action={transaction ? "/transactions/update" : "/transactions/create"}
      entityId={transaction?.id}
    >
      {({ fetcher }) => (
        <>
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
                  invalid={!!fetcher.data?.errors?.description}
                />
              </Field>
              <BookingsTable
                transaction={transaction}
                accounts={accounts}
                lockedAccountId={lockedAccountId}
                data={fetcher.data}
              />
              <FormErrorMessage />
            </FieldGroup>
          </DialogBody>
          <DialogActions>
            <CancelButton />
            <CreateOrSaveButton />
          </DialogActions>
        </>
      )}
    </FormDialog>
  );
}

function BookingsTable({
  transaction,
  accounts,
  lockedAccountId,
  data,
}: {
  transaction?: Serialize<TransactionWithBookings>;
  accounts: AccountOption[];
  lockedAccountId: string;
  data: ReturnType<typeof useFetcher<typeof action>>["data"];
}) {
  const [bookings, setBookings] = useState<BookingFormValues[]>(
    transaction
      ? transaction.bookings.map((b) => ({
          ...b,
          date: formatISO(b.date, { representation: "date" }),
          value: b.value.toString(),
        }))
      : addNewBooking(addNewBooking([], { lockedAccountId })),
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
        {bookings.map((booking, i) => {
          const selectedAccount = accounts.find(
            (a) => a.id === booking.accountId,
          );
          return (
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
                  invalid={!!data?.errors?.[`bookings[${i}][date]`]}
                />
              </TableCell>
              <TableCell>
                <AccountCombobox
                  disabled={booking.isAccountLocked}
                  name={`bookings[${i}][accountId]`}
                  accounts={accounts}
                  defaultValue={booking.accountId}
                  onChange={(accountId) => {
                    setBookings(
                      bookings.map((b) =>
                        b.id === booking.id
                          ? { ...b, accountId: accountId ?? "" }
                          : b,
                      ),
                    );
                  }}
                  invalid={!!data?.errors?.[`bookings[${i}][accountId]`]}
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
                  invalid={!!data?.errors?.[`bookings[${i}][description]`]}
                />
              </TableCell>
              <TableCell>
                {/* TODO support SECURITY accounts */}
                {selectedAccount?.unit === "CURRENCY" ? (
                  <CurrencyCombobox
                    name={`bookings[${i}][currency]`}
                    defaultValue={booking.currency ?? ""}
                    invalid={!!data?.errors?.[`bookings[${i}][currency]`]}
                  />
                ) : selectedAccount?.unit === "CRYPTOCURRENCY" ? (
                  <CryptocurrencyCombobox
                    name={`bookings[${i}][cryptocurrency]`}
                    defaultValue={booking.cryptocurrency ?? ""}
                    invalid={!!data?.errors?.[`bookings[${i}][cryptocurrency]`]}
                  />
                ) : (
                  // TODO determine how we solve this. An Equity account does not have a unit because bookings can have any unit
                  <CurrencyCombobox
                    name={`bookings[${i}][currency]`}
                    defaultValue={booking.currency ?? ""}
                    invalid={!!data?.errors?.[`bookings[${i}][currency]`]}
                  />
                )}
              </TableCell>
              <TableCell>
                <FormattedNumberInput
                  name={`bookings[${i}][value]`}
                  defaultValue={booking.value}
                  invalid={!!data?.errors?.[`bookings[${i}][value]`]}
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
          );
        })}
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
