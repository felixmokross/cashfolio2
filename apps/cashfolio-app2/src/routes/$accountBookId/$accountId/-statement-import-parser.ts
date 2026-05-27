import Papa from "papaparse";
import { parseUtcDayDate } from "@/shared/date";
import { createStatementImportDraft } from "./-statement-import-draft";
import {
  DEFAULT_STATEMENT_IMPORT_CSV_FORMAT,
  STATEMENT_IMPORT_CSV_HEADERS,
  type CurrentAccountForStatementImport,
  type StatementImportCsvFormat,
  type StatementImportCsvRow,
  type StatementImportDraft,
  type StatementImportParseResult,
} from "./-statement-import-types";

const STRICT_DECIMAL_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const DATE_LIKE_PATTERN = /^\d{1,4}[-./]\d{1,2}[-./]\d{1,4}$/;
const NUMBER_LIKE_PATTERN = /^-?[\d\s'.,]+$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

export function parseStatementImportCsv(args: {
  text: string;
  currentAccount: CurrentAccountForStatementImport;
  format?: StatementImportCsvFormat;
}): StatementImportParseResult {
  const format = args.format ?? DEFAULT_STATEMENT_IMPORT_CSV_FORMAT;
  const requiredColumnCount = getRequiredColumnCount(format);
  const parsed = Papa.parse<string[]>(args.text, {
    header: false,
    delimitersToGuess: [...format.delimitersToGuess],
    skipEmptyLines: "greedy",
  });
  const errors = parsed.errors.map((error) =>
    error.row != null
      ? `Row ${error.row + 1}: ${error.message}`
      : error.message,
  );

  const [headerRow, ...dataRows] = parsed.data;
  if (!headerRow || headerRow.length < requiredColumnCount) {
    errors.unshift(
      `CSV must include at least ${requiredColumnCount} columns in this order: ${format.columns.join(", ")}`,
    );
    return { drafts: [], errors };
  }
  if (isLikelyHeaderlessDataRow(headerRow, format)) {
    errors.unshift("CSV must include a header row before transaction rows.");
    return { drafts: [], errors };
  }

  const rows = dataRows
    .map((row, index) => ({ row, sourceRowNumber: index + 2 }))
    .filter(({ row }) =>
      row.slice(0, requiredColumnCount).some((value) => value?.trim() !== ""),
    );
  if (rows.length === 0) {
    errors.push("CSV must contain at least one transaction row.");
  }

  const drafts: StatementImportDraft[] = [];
  rows.forEach(({ row, sourceRowNumber }) => {
    const rowShapeErrors = validateCsvRowShape({
      row,
      headerColumnCount: headerRow.length,
      delimiter: parsed.meta.delimiter,
      format,
      sourceRowNumber,
    });
    if (rowShapeErrors.length > 0) {
      errors.push(...rowShapeErrors);
      return;
    }

    const csvRow = toStatementImportCsvRow(row, format);
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

function getRequiredColumnCount(format: StatementImportCsvFormat): number {
  return format.columns.length;
}

function getColumnValue(
  row: string[],
  format: StatementImportCsvFormat,
  column: (typeof STATEMENT_IMPORT_CSV_HEADERS)[number],
): string {
  const index = format.columns.indexOf(column);
  return index === -1 ? "" : (row[index] ?? "");
}

function toStatementImportCsvRow(
  row: string[],
  format: StatementImportCsvFormat,
): StatementImportCsvRow {
  return {
    date: getColumnValue(row, format, "date"),
    amount: getColumnValue(row, format, "amount"),
    "original amount": getColumnValue(row, format, "original amount"),
    "original currency": getColumnValue(row, format, "original currency"),
    "exchange rate": getColumnValue(row, format, "exchange rate"),
    description: getColumnValue(row, format, "description"),
  };
}

function validateCsvRowShape(args: {
  row: string[];
  headerColumnCount: number;
  delimiter: string;
  format: StatementImportCsvFormat;
  sourceRowNumber: number;
}): string[] {
  const errors: string[] = [];
  const requiredColumnCount = getRequiredColumnCount(args.format);
  if (args.row.length < requiredColumnCount) {
    errors.push(
      `Row ${args.sourceRowNumber}: CSV row must include at least ${requiredColumnCount} columns.`,
    );
  }
  if (args.row.length > args.headerColumnCount) {
    errors.push(
      `Row ${args.sourceRowNumber}: CSV row has more columns than the header row; check for unquoted delimiters in values.`,
    );
  }
  if (
    args.delimiter === "," &&
    args.row.length > requiredColumnCount &&
    isLikelyShiftedByUnquotedExchangeRateDecimalComma(args.row, args.format)
  ) {
    errors.push(
      `Row ${args.sourceRowNumber}: CSV row appears to have an unquoted decimal comma before the description column; use semicolon delimiter or quote the value.`,
    );
  }

  return errors;
}

function isLikelyShiftedByUnquotedExchangeRateDecimalComma(
  row: string[],
  format: StatementImportCsvFormat,
): boolean {
  const exchangeRateColumnIndex = format.columns.indexOf("exchange rate");
  const descriptionColumnIndex = format.columns.indexOf("description");
  if (
    exchangeRateColumnIndex === -1 ||
    descriptionColumnIndex === -1 ||
    exchangeRateColumnIndex + 1 !== descriptionColumnIndex
  ) {
    return false;
  }

  const exchangeRateIntegerPart = row[exchangeRateColumnIndex]?.trim() ?? "";
  const shiftedDecimalPart = row[descriptionColumnIndex]?.trim() ?? "";
  const displacedDescription = row[descriptionColumnIndex + 1]?.trim() ?? "";
  return (
    /^\d+$/.test(exchangeRateIntegerPart) &&
    /^\d+$/.test(shiftedDecimalPart) &&
    displacedDescription !== ""
  );
}

function isLikelyHeaderlessDataRow(
  row: string[],
  format: StatementImportCsvFormat,
): boolean {
  const candidate = toStatementImportCsvRow(row, format);
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
