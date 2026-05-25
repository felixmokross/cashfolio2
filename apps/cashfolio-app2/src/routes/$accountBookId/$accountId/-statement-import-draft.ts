import { createId } from "@paralleldrive/cuid2";
import { isBefore } from "date-fns";
import {
  AccountType,
  type EquityAccountSubtype,
  Unit,
} from "@/.prisma-client/enums";
import type { AccountOption } from "@/components/edit-transaction-modal";
import type { BookingValues } from "@/components/edit-transaction-modal-types";
import { createBookingUnitDefaults } from "@/components/edit-transaction-modal-unit-defaults";
import {
  getSimpleTransactionUnitIdentifier,
  getUnitIdentifier,
  isExpenseAccount,
  isIncomeAccount,
  isOpeningBalancesAccount,
} from "@/shared/account-utils";
import { getBookingUnitFields } from "@/shared/booking-unit-fields";
import { formatUtcDate, parseUtcDayDate, startOfUtcDay } from "@/shared/date";
import { OPENING_BALANCES_MANAGEMENT_MESSAGE } from "@/shared/opening-balances";
import type { TransactionMutationValues } from "./-page-view";
import type {
  CurrentAccountForStatementImport,
  StatementImportCsvRow,
  StatementImportDraft,
  StatementImportDraftStatus,
} from "./-statement-import-types";

export function createStatementImportDraft(args: {
  row: StatementImportCsvRow;
  sourceRowNumber: number;
  currentAccount: CurrentAccountForStatementImport;
}): StatementImportDraft {
  const date = parseUtcDayDate(args.row.date.trim());
  if (!date) {
    throw new Error("Date must be a valid UTC day.");
  }

  const amount = Number(args.row.amount.trim());
  const originalAmount = parseOptionalStrictNumber(args.row["original amount"]);
  const originalCurrency =
    args.row["original currency"].trim() === ""
      ? undefined
      : args.row["original currency"].trim();
  const currentUnitFields = getBookingUnitFields(
    args.currentAccount,
    "current account",
  );
  const currentValue = amount;
  const isoDate = date.toISOString();
  const description = args.row.description;
  const counterUnitFields =
    originalAmount != null && originalCurrency
      ? {
          unit: Unit.CURRENCY,
          currency: originalCurrency,
        }
      : currentUnitFields;
  const counterValue =
    originalAmount != null && originalCurrency
      ? -Math.sign(amount) * Math.abs(originalAmount)
      : -amount;

  return {
    id: createId(),
    sourceRowNumber: args.sourceRowNumber,
    currentAccountId: args.currentAccount.id,
    ignored: false,
    date: isoDate,
    amount,
    originalAmount,
    originalCurrency,
    counterAccountId: "",
    description,
    transaction: {
      description,
      bookings: [
        {
          date: isoDate,
          accountId: args.currentAccount.id,
          description: "",
          ...currentUnitFields,
          value: currentValue,
        },
        {
          date: isoDate,
          accountId: "",
          description: "",
          ...counterUnitFields,
          value: counterValue,
        },
      ],
    },
  };
}

export function getStatementImportDraftStatus(args: {
  draft: StatementImportDraft;
  accounts: AccountOption[];
  accountBookStartDate: Date;
}): StatementImportDraftStatus {
  if (args.draft.ignored) {
    return {
      kind: "ignored",
      label: "Ignored",
      color: "gray",
      message: "This row will not be imported.",
    };
  }

  const bookings = args.draft.transaction.bookings;
  const accountBookStartDay = startOfUtcDay(args.accountBookStartDate);
  const accountBookStartDateLabel = formatUtcDate(accountBookStartDay);

  if (
    !bookings.some(
      (booking) => booking.accountId === args.draft.currentAccountId,
    )
  ) {
    return error(
      "Imported transaction must include the current ledger account.",
    );
  }

  for (let index = 0; index < bookings.length; index += 1) {
    const booking = bookings[index];
    if (!booking.accountId) {
      return needsEdit("Counter account is required.");
    }

    const account = args.accounts.find(
      (candidate) => candidate.value === booking.accountId,
    );
    if (!account) {
      return error(`Booking ${index + 1}: account is not available.`);
    }
    if (isOpeningBalancesAccount(account)) {
      return error(OPENING_BALANCES_MANAGEMENT_MESSAGE);
    }
    if (isIncomeAccount(account) && booking.value > 0) {
      return error("Income accounts cannot have debit entries.");
    }
    if (isExpenseAccount(account) && booking.value < 0) {
      return error("Expense accounts cannot have credit entries.");
    }

    const bookingDate = parseUtcDayDate(booking.date);
    if (!bookingDate) {
      return error(`Booking ${index + 1}: date must be a valid UTC day.`);
    }
    const bookingDay = startOfUtcDay(bookingDate);
    if (isBefore(bookingDay, accountBookStartDay)) {
      return error(
        `Booking ${index + 1}: Date cannot be before account book start date (${accountBookStartDateLabel}).`,
      );
    }

    if (!booking.unit) {
      return error(`Booking ${index + 1}: unit is required.`);
    }
    if (booking.unit === Unit.CURRENCY && !booking.currency) {
      return error(`Booking ${index + 1}: currency is required.`);
    }
    if (booking.unit === Unit.CRYPTOCURRENCY && !booking.cryptocurrency) {
      return error(`Booking ${index + 1}: cryptocurrency is required.`);
    }
    if (
      booking.unit === Unit.SECURITY &&
      (!booking.symbol || !booking.tradeCurrency)
    ) {
      return error(
        `Booking ${index + 1}: symbol and trade currency are required.`,
      );
    }
    if (booking.value === 0) {
      return error(`Booking ${index + 1}: value must be non-zero.`);
    }
  }

  const unitIdentifiers = new Set(
    bookings.map((booking) => getUnitIdentifier(booking)),
  );
  if (unitIdentifiers.size === 1) {
    const sum = bookings.reduce((acc, booking) => acc + booking.value, 0);
    if (Math.abs(sum) > 0.001) {
      return error("The sum of all bookings must be zero.");
    }
  }

  return {
    kind: "ready",
    label: "Ready",
    color: "green",
    message: null,
  };
}

export function toStatementImportEditInitialValues(
  draft: StatementImportDraft,
): {
  description: string;
  bookings: Omit<BookingValues, "key">[];
} {
  return {
    description: draft.transaction.description,
    bookings: draft.transaction.bookings.map((booking) => ({
      date: booking.date,
      account: booking.accountId,
      description: booking.description,
      unit: booking.unit,
      currency: booking.currency,
      cryptocurrency: booking.cryptocurrency,
      symbol: booking.symbol,
      tradeCurrency: booking.tradeCurrency,
      debit: booking.value > 0 ? booking.value : undefined,
      credit: booking.value < 0 ? -booking.value : undefined,
    })),
  };
}

export function updateStatementImportDraftTransaction(args: {
  draft: StatementImportDraft;
  transaction: TransactionMutationValues;
}): StatementImportDraft {
  const currentAccountId = args.draft.currentAccountId;
  const currentBooking =
    args.transaction.bookings.find(
      (booking) => booking.accountId === currentAccountId,
    ) ?? args.transaction.bookings[0];

  return {
    ...args.draft,
    date: currentBooking?.date ?? args.draft.date,
    amount: currentBooking?.value ?? args.draft.amount,
    counterAccountId: getCounterAccountIdFromTransaction({
      currentAccountId,
      transaction: args.transaction,
    }),
    description: args.transaction.description,
    transaction: args.transaction,
  };
}

export function updateStatementImportDraftDescription(args: {
  draft: StatementImportDraft;
  description: string;
}): StatementImportDraft {
  return {
    ...args.draft,
    description: args.description,
    transaction: {
      ...args.draft.transaction,
      description: args.description,
    },
  };
}

export function updateStatementImportDraftCounterAccount(args: {
  draft: StatementImportDraft;
  selectedAccount: AccountOption | undefined;
}): StatementImportDraft {
  if (!hasStatementImportSingleCounterBooking(args.draft)) {
    return args.draft;
  }

  const counterBookingIndex = findStatementImportCounterBookingIndex(
    args.draft,
  );
  if (counterBookingIndex === -1) {
    return args.draft;
  }

  const transaction = args.draft.transaction;
  const currentBooking = transaction.bookings.find(
    (booking) => booking.accountId === args.draft.currentAccountId,
  );
  const counterBooking = transaction.bookings[counterBookingIndex];
  if (!counterBooking) {
    return args.draft;
  }

  if (!args.selectedAccount) {
    return updateStatementImportDraftTransaction({
      draft: args.draft,
      transaction: {
        ...transaction,
        bookings: transaction.bookings.map((booking, index) =>
          index === counterBookingIndex
            ? { ...booking, accountId: "" }
            : booking,
        ),
      },
    });
  }

  const selectedAccount = args.selectedAccount;
  const unitDefaults = createBookingUnitDefaults({
    selectedAccount,
    lockedBooking: currentBooking ? toBookingValues(currentBooking) : undefined,
    currentBooking: toBookingValues(counterBooking),
    preserveCurrentBookingUnitForUnitlessEquity: true,
  });

  return updateStatementImportDraftTransaction({
    draft: args.draft,
    transaction: {
      ...transaction,
      bookings: transaction.bookings.map((booking, index) =>
        index === counterBookingIndex
          ? {
              ...booking,
              accountId: selectedAccount.value,
              ...unitDefaults,
            }
          : booking,
      ),
    },
  });
}

export function getStatementImportCounterAccountId(
  draft: StatementImportDraft,
): string {
  const counterBookingIndex = findStatementImportCounterBookingIndex(draft);
  return counterBookingIndex === -1
    ? ""
    : (draft.transaction.bookings[counterBookingIndex]?.accountId ?? "");
}

export function hasStatementImportSingleCounterBooking(
  draft: StatementImportDraft,
): boolean {
  return (
    draft.transaction.bookings.filter(
      (booking) => booking.accountId !== draft.currentAccountId,
    ).length === 1
  );
}

export function getStatementImportDisabledReason(account: {
  type: AccountType;
  unit: Unit | null;
  currency: string | null;
  cryptocurrency: string | null;
  symbol: string | null;
  tradeCurrency: string | null;
}): string | null {
  if (
    account.type !== AccountType.ASSET &&
    account.type !== AccountType.LIABILITY
  ) {
    return "Statement imports are only available for asset and liability accounts.";
  }

  if (!getSimpleTransactionUnitIdentifier(account)) {
    return "Statement imports require a current account with a complete unit.";
  }

  return null;
}

export function shouldIncludeStatementImportAccountOption(
  account: {
    id: string;
    isActive: boolean;
    type: AccountType;
    equityAccountSubtype?: EquityAccountSubtype | null;
  },
  currentAccountId: string,
): boolean {
  return (
    !isOpeningBalancesAccount(account) &&
    (account.isActive || account.id === currentAccountId)
  );
}

function parseOptionalStrictNumber(value: string): number | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : Number(trimmed);
}

function findStatementImportCounterBookingIndex(
  draft: StatementImportDraft,
): number {
  return draft.transaction.bookings.findIndex(
    (booking) => booking.accountId !== draft.currentAccountId,
  );
}

function getCounterAccountIdFromTransaction(args: {
  currentAccountId: string | undefined;
  transaction: TransactionMutationValues;
}): string {
  return (
    args.transaction.bookings.find(
      (booking) =>
        booking.accountId !== "" && booking.accountId !== args.currentAccountId,
    )?.accountId ?? ""
  );
}

function toBookingValues(
  booking: TransactionMutationValues["bookings"][number],
): BookingValues {
  return {
    key: "",
    date: booking.date,
    account: booking.accountId,
    description: booking.description,
    unit: booking.unit,
    currency: booking.currency,
    cryptocurrency: booking.cryptocurrency,
    symbol: booking.symbol,
    tradeCurrency: booking.tradeCurrency,
    debit: booking.value > 0 ? booking.value : undefined,
    credit: booking.value < 0 ? -booking.value : undefined,
  };
}

function needsEdit(message: string): StatementImportDraftStatus {
  return {
    kind: "needs-edit",
    label: "Needs edit",
    color: "yellow",
    message,
  };
}

function error(message: string): StatementImportDraftStatus {
  return {
    kind: "error",
    label: "Error",
    color: "red",
    message,
  };
}
