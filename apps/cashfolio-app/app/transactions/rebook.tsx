import { useState } from "react";
import type { Serialize } from "~/serialization";
import type { BookingWithTransaction } from "~/accounts/detail/types";
import {
  CancelButton,
  CreateOrSaveButton,
  FormDialog,
} from "~/platform/forms/form-dialog";
import { useAccountBook } from "~/account-books/hooks";
import {
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "~/platform/dialog";
import { Field, FieldGroup, Fieldset, Label } from "~/platform/forms/fieldset";
import { AccountCombobox } from "~/accounts/account-combobox";
import type { AccountOption } from "~/types";
import {
  getAccountUnitInfo,
  getUnitInfo,
  getUnitLabel,
  isSameUnit,
} from "~/units/functions";
import type { Account } from "~/.prisma-client/client";
import { Unit } from "~/.prisma-client/enums";

export function useRebook() {
  const [isOpen, setIsOpen] = useState(false);
  const [booking, setBooking] = useState<Serialize<BookingWithTransaction>>();
  return {
    rebookProps: {
      isOpen,
      onClose: () => setIsOpen(false),
      booking,
    },
    onRebook(booking: Serialize<BookingWithTransaction>) {
      setBooking(booking);
      setIsOpen(true);
    },
  };
}
export function Rebook({
  isOpen,
  onClose,
  booking,
  accounts,
  currentAccount,
}: {
  isOpen: boolean;
  onClose: () => void;
  booking?: Serialize<BookingWithTransaction>;
  accounts: Serialize<AccountOption>[];
  currentAccount: Serialize<Account>;
}) {
  const accountBook = useAccountBook();
  const bookingIndex = booking?.transaction.bookings.findIndex(
    (b) => b.id === booking.id,
  );

  if (!booking) return null;

  const bookingUnit = getUnitInfo(booking);

  return (
    <FormDialog
      open={isOpen}
      size="md"
      onClose={onClose}
      entityId={booking.id}
      action={`/${accountBook.id}/transactions/update`}
    >
      <input
        type="hidden"
        name="transactionId"
        value={booking.transaction.id}
      />
      <input
        type="hidden"
        name="description"
        value={booking.transaction.description}
      />
      <DialogTitle>Rebook to another account</DialogTitle>
      <DialogDescription>
        Move this booking from the current account to another account. If
        rebooking to an asset or liability account, the new account must be a{" "}
        {getUnitLabel(bookingUnit)} account.
      </DialogDescription>
      <DialogBody>
        <Fieldset>
          <FieldGroup>
            {booking.transaction.bookings.map((b, index) => (
              <>
                <input
                  type="hidden"
                  name={`bookings[${index}][date]`}
                  value={b.date}
                />
                <input
                  type="hidden"
                  name={`bookings[${index}][description]`}
                  value={b.description}
                />
                {index === bookingIndex ? (
                  <Field>
                    <Label>New Account</Label>
                    <AccountCombobox
                      autoFocus
                      name={`bookings[${index}][accountId]`}
                      accounts={accounts.filter(
                        (a) =>
                          a.isActive &&
                          a.id !== currentAccount.id &&
                          (!a.unit ||
                            isSameUnit(getAccountUnitInfo(a)!, getUnitInfo(b))),
                      )}
                    />
                  </Field>
                ) : (
                  <input
                    type="hidden"
                    name={`bookings[${index}][accountId]`}
                    value={b.accountId}
                  />
                )}
                <input
                  type="hidden"
                  name={`bookings[${index}][unit]`}
                  value={b.unit}
                />
                {b.unit === Unit.CURRENCY ? (
                  <input
                    type="hidden"
                    name={`bookings[${index}][currency]`}
                    value={b.currency || ""}
                  />
                ) : b.unit === Unit.CRYPTOCURRENCY ? (
                  <input
                    type="hidden"
                    name={`bookings[${index}][cryptocurrency]`}
                    value={b.cryptocurrency || ""}
                  />
                ) : b.unit === Unit.SECURITY ? (
                  <input
                    type="hidden"
                    name={`bookings[${index}][symbol]`}
                    value={b.symbol || ""}
                  />
                ) : null}
                <input
                  type="hidden"
                  name={`bookings[${index}][value]`}
                  value={b.value}
                />
              </>
            ))}
          </FieldGroup>
        </Fieldset>
      </DialogBody>
      <DialogActions>
        <CancelButton />
        <CreateOrSaveButton />
      </DialogActions>
    </FormDialog>
  );
}
