import type { BookingUnitFieldsSource } from "@/shared/booking-unit-fields";
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

export type StatementImportCsvColumnRef =
  | number
  | { index: number }
  | { header: string };

export type StatementImportCsvDateFormat =
  | "yyyy-MM-dd"
  | "dd.MM.yyyy"
  | "MM/dd/yyyy";

export type StatementImportCsvNumberFormat = {
  decimalSeparator: "." | ",";
  thousandsSeparator?: "." | "," | "'" | " ";
};

export type StatementImportCsvAmountMapping =
  | {
      mode: "signed";
      column: StatementImportCsvColumnRef;
      invertSign?: boolean;
    }
  | {
      mode: "debit-credit";
      debitColumn?: StatementImportCsvColumnRef;
      creditColumn?: StatementImportCsvColumnRef;
    };

export type StatementImportCsvDescriptionMapping =
  | StatementImportCsvColumnRef
  | {
      columns: readonly StatementImportCsvColumnRef[];
      separator?: string;
    };

export type StatementImportCsvMappings = {
  date: StatementImportCsvColumnRef;
  amount: StatementImportCsvAmountMapping;
  originalAmount?: StatementImportCsvColumnRef;
  originalCurrency?: StatementImportCsvColumnRef;
  exchangeRate?: StatementImportCsvColumnRef;
  description?: StatementImportCsvDescriptionMapping;
};

export type StatementImportCsvFormat = {
  hasHeader: boolean;
  delimitersToGuess: readonly string[];
  columns?: readonly StatementImportCsvHeader[];
  mappings?: StatementImportCsvMappings;
  dateFormat?: StatementImportCsvDateFormat;
  numberFormat?: StatementImportCsvNumberFormat;
};

export const DEFAULT_STATEMENT_IMPORT_CSV_FORMAT = {
  hasHeader: true,
  delimitersToGuess: [",", ";"],
  columns: STATEMENT_IMPORT_CSV_HEADERS,
  dateFormat: "yyyy-MM-dd",
  numberFormat: {
    decimalSeparator: ".",
  },
} as const satisfies StatementImportCsvFormat;

export type StatementImportCsvRow = Record<StatementImportCsvHeader, string>;

export type CurrentAccountForStatementImport = {
  id: string;
} & BookingUnitFieldsSource;

export type StatementImportDraft = {
  id: string;
  sourceRowNumber: number;
  currentAccountId: string;
  ignored: boolean;
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
      kind: "ignored";
      label: "Ignored";
      color: "gray";
      message: string;
    }
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
