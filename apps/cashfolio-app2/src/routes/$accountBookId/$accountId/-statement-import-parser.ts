import Papa from "papaparse";
import { parseUtcDayDate } from "@/shared/date";
import { createStatementImportDraft } from "./-statement-import-draft";
import {
  STATEMENT_IMPORT_CSV_HEADERS,
  type CurrentAccountForStatementImport,
  type StatementImportCsvRow,
  type StatementImportDraft,
  type StatementImportParseResult,
} from "./-statement-import-types";

const STRICT_DECIMAL_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const DATE_LIKE_PATTERN = /^\d{1,4}[-./]\d{1,2}[-./]\d{1,4}$/;
const NUMBER_LIKE_PATTERN = /^-?[\d\s'.,]+$/;
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
  if (isLikelyHeaderlessDataRow(headerRow)) {
    errors.unshift("CSV must include a header row before transaction rows.");
    return { drafts: [], errors };
  }

  const rows = dataRows
    .map((row, index) => ({ row, sourceRowNumber: index + 2 }))
    .filter(({ row }) =>
      row.slice(0, REQUIRED_COLUMN_COUNT).some((value) => value?.trim() !== ""),
    );
  if (rows.length === 0) {
    errors.push("CSV must contain at least one transaction row.");
  }

  const drafts: StatementImportDraft[] = [];
  rows.forEach(({ row, sourceRowNumber }) => {
    const rowShapeErrors = validateCsvRowShape({
      row,
      headerColumnCount: headerRow.length,
      sourceRowNumber,
    });
    if (rowShapeErrors.length > 0) {
      errors.push(...rowShapeErrors);
      return;
    }

    const csvRow = toStatementImportCsvRow(row);
    const rowErrors = validateCsvRow(csvRow, sourceRowNumber);
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      return;
    }

    drafts.push(
      createStatementImportDraft({
        row: csvRow,
        sourceRowNumber,
        currentAccount: args.currentAccount,
      }),
    );
  });

  return errors.length > 0 ? { drafts: [], errors } : { drafts, errors: [] };
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

function validateCsvRowShape(args: {
  row: string[];
  headerColumnCount: number;
  sourceRowNumber: number;
}): string[] {
  const errors: string[] = [];
  if (args.row.length < REQUIRED_COLUMN_COUNT) {
    errors.push(
      `Row ${args.sourceRowNumber}: CSV row must include at least ${REQUIRED_COLUMN_COUNT} columns.`,
    );
  }
  if (args.row.length > args.headerColumnCount) {
    errors.push(
      `Row ${args.sourceRowNumber}: CSV row has more columns than the header row; check for unquoted delimiters in values.`,
    );
  }

  return errors;
}

function isLikelyHeaderlessDataRow(row: string[]): boolean {
  const candidate = toStatementImportCsvRow(row);
  const date = candidate.date.trim();
  const amount = candidate.amount.trim();
  return (
    parseUtcDayDate(date) != null ||
    DATE_LIKE_PATTERN.test(date) ||
    STRICT_DECIMAL_PATTERN.test(amount) ||
    (NUMBER_LIKE_PATTERN.test(amount) && /\d/.test(amount))
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
