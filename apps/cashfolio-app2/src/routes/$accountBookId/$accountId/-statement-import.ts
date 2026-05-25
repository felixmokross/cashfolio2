import Papa from "papaparse";
import { createId } from "@paralleldrive/cuid2";
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
import {
  getBookingUnitFields,
  type BookingUnitFieldsSource,
} from "@/shared/booking-unit-fields";
import { parseUtcDayDate } from "@/shared/date";
import { OPENING_BALANCES_MANAGEMENT_MESSAGE } from "@/shared/opening-balances";
import type { TransactionMutationValues } from "./-page-view";

export const STATEMENT_IMPORT_CSV_HEADERS = [
  "date",
  "amount",
  "original amount",
  "original currency",
  "exchange rate",
  "description",
] as const;

type StatementImportCsvHeader = (typeof STATEMENT_IMPORT_CSV_HEADERS)[number];

export type StatementImportCsvRow = Record<StatementImportCsvHeader, string>;

export type StatementImportDraft = {
  id: string;
  sourceRowNumber: number;
  date: string;
  amount: number;
  originalAmount: number | undefined;
  originalCurrency: string | undefined;
  counterAccountId: string;
  description: string;
  transaction: TransactionMutationValues;
};

export type StatementImportDraftStatus =
  | {
      kind: "ready";
      label: "Ready";
      color: "green";
      message: null;
    }
  | {
      kind: "needs-edit";
      label: "Needs edit";
      color: "yellow";
      message: string;
    }
  | {
      kind: "error";
      label: "Error";
      color: "red";
      message: string;
    };

export type StatementImportParseResult = {
  drafts: StatementImportDraft[];
  errors: string[];
};

type CurrentAccountForStatementImport = {
  id: string;
} & BookingUnitFieldsSource;

const STRICT_DECIMAL_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const REQUIRED_COLUMN_COUNT = STATEMENT_IMPORT_CSV_HEADERS.length;

export function parseStatementImportCsv(args: {
  text: string;
  currentAccount: CurrentAccountForStatementImport;
}): StatementImportParseResult {
  const parsed = Papa.parse<string[]>(args.text, {
    header: false,
    delimitersToGuess: [",", ";"],
    skipEmptyLines: "greedy",
  });
  const errors = parsed.errors.map((error) =>
    error.row != null
      ? `Row ${error.row + 1}: ${error.message}`
      : error.message,
  );

  const [headerRow, ...dataRows] = parsed.data;
  if (!headerRow || headerRow.length < REQUIRED_COLUMN_COUNT) {
    errors.unshift(
      `CSV must include at least ${REQUIRED_COLUMN_COUNT} columns in this order: ${STATEMENT_IMPORT_CSV_HEADERS.join(", ")}`,
    );
    return { drafts: [], errors };
  }
  if (isDataRow(headerRow, 1)) {
    errors.unshift("CSV must include a header row before transaction rows.");
    return { drafts: [], errors };
  }

  const rows = dataRows
    .filter((row) =>
      row.slice(0, REQUIRED_COLUMN_COUNT).some((value) => value?.trim() !== ""),
    )
    .map(toStatementImportCsvRow);
  if (rows.length === 0) {
    errors.push("CSV must contain at least one transaction row.");
  }

  const drafts: StatementImportDraft[] = [];
  rows.forEach((row, index) => {
    const sourceRowNumber = index + 2;
    const rowErrors = validateCsvRow(row, sourceRowNumber);
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      return;
    }

    drafts.push(
      createStatementImportDraft({
        row,
        sourceRowNumber,
        currentAccount: args.currentAccount,
      }),
    );
  });

  return errors.length > 0 ? { drafts: [], errors } : { drafts, errors: [] };
}

export function createStatementImportDraft(args: {
  row: StatementImportCsvRow;
  sourceRowNumber: number;
  currentAccount: CurrentAccountForStatementImport;
}): StatementImportDraft {
  const date = parseUtcDayDate(args.row.date.trim());
  if (!date) {
    throw new Error("Date must be a valid UTC day.");
  }

  const amount = parseStrictNumber(args.row.amount);
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
}): StatementImportDraftStatus {
  const bookings = args.draft.transaction.bookings;

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
  const currentAccountId = args.draft.transaction.bookings[0]?.accountId;
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

export function updateStatementImportDraftCounterAccount(args: {
  draft: StatementImportDraft;
  selectedAccount: AccountOption | undefined;
}): StatementImportDraft {
  const counterBookingIndex = findStatementImportCounterBookingIndex(
    args.draft,
  );
  if (counterBookingIndex === -1) {
    return args.draft;
  }

  const transaction = args.draft.transaction;
  const currentBooking = transaction.bookings[0];
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

function toStatementImportCsvRow(row: string[]): StatementImportCsvRow {
  return {
    date: row[0] ?? "",
    amount: row[1] ?? "",
    "original amount": row[2] ?? "",
    "original currency": row[3] ?? "",
    "exchange rate": row[4] ?? "",
    description: row[5] ?? "",
  };
}

function isDataRow(row: string[], sourceRowNumber: number): boolean {
  return (
    validateCsvRow(toStatementImportCsvRow(row), sourceRowNumber).length === 0
  );
}

function validateCsvRow(
  row: StatementImportCsvRow,
  sourceRowNumber: number,
): string[] {
  const errors: string[] = [];
  const date = parseUtcDayDate(row.date?.trim() ?? "");
  if (!date) {
    errors.push(`Row ${sourceRowNumber}: date must be ISO yyyy-mm-dd.`);
  }

  const amount = validateStrictNumber(row.amount, "amount", sourceRowNumber);
  const originalAmount = validateStrictNumber(
    row["original amount"],
    "original amount",
    sourceRowNumber,
    { required: false },
  );
  errors.push(...amount, ...originalAmount);

  if (Number(row.amount) === 0) {
    errors.push(`Row ${sourceRowNumber}: amount must be non-zero.`);
  }
  const hasOriginalAmount = row["original amount"].trim() !== "";
  const hasOriginalCurrency = row["original currency"].trim() !== "";
  if (hasOriginalAmount && Number(row["original amount"]) === 0) {
    errors.push(`Row ${sourceRowNumber}: original amount must be non-zero.`);
  }
  if (!hasOriginalAmount && hasOriginalCurrency) {
    errors.push(
      `Row ${sourceRowNumber}: original amount is required when original currency is set.`,
    );
  }
  if (hasOriginalAmount && !hasOriginalCurrency) {
    errors.push(
      `Row ${sourceRowNumber}: original currency is required when original amount is set.`,
    );
  }
  if (
    row["original currency"].trim() !== "" &&
    !CURRENCY_PATTERN.test(row["original currency"].trim())
  ) {
    errors.push(
      `Row ${sourceRowNumber}: original currency must be a 3-letter uppercase code.`,
    );
  }

  return errors;
}

function validateStrictNumber(
  value: string | undefined,
  field: string,
  sourceRowNumber: number,
  options?: { required?: boolean },
): string[] {
  const required = options?.required ?? true;
  const trimmed = value?.trim() ?? "";
  if (!trimmed && !required) {
    return [];
  }
  if (!trimmed || !STRICT_DECIMAL_PATTERN.test(trimmed)) {
    return [`Row ${sourceRowNumber}: ${field} must be a dot-decimal number.`];
  }

  const number = Number(trimmed);
  if (!Number.isFinite(number)) {
    return [`Row ${sourceRowNumber}: ${field} must be finite.`];
  }

  return [];
}

function parseStrictNumber(value: string): number {
  return Number(value.trim());
}

function parseOptionalStrictNumber(value: string): number | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : Number(trimmed);
}

function findStatementImportCounterBookingIndex(
  draft: StatementImportDraft,
): number {
  const currentAccountId = draft.transaction.bookings[0]?.accountId;
  return draft.transaction.bookings.findIndex(
    (booking, index) => index > 0 && booking.accountId !== currentAccountId,
  );
}

function getCounterAccountIdFromTransaction(args: {
  currentAccountId: string | undefined;
  transaction: TransactionMutationValues;
}): string {
  return (
    args.transaction.bookings.find(
      (booking, index) =>
        index > 0 && booking.accountId !== args.currentAccountId,
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
