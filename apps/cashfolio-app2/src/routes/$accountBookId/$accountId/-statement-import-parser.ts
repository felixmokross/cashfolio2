import Papa from "papaparse";
import { parseUtcDayDate } from "@/shared/date";
import { createStatementImportDraft } from "./-statement-import-draft";
import {
  DEFAULT_STATEMENT_IMPORT_CSV_FORMAT,
  STATEMENT_IMPORT_CSV_HEADERS,
  type CurrentAccountForStatementImport,
  type StatementImportCsvAmountMapping,
  type StatementImportCsvColumnRef,
  type StatementImportCsvDateFormat,
  type StatementImportCsvDescriptionMapping,
  type StatementImportCsvFormat,
  type StatementImportCsvRow,
  type StatementImportDraft,
  type StatementImportCsvMappings,
  type StatementImportCsvNumberFormat,
  type StatementImportParseResult,
} from "./-statement-import-types";

const STRICT_DECIMAL_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const DATE_LIKE_PATTERN = /^\d{1,4}[-./]\d{1,2}[-./]\d{1,4}$/;
const NUMBER_LIKE_PATTERN = /^-?[\d\s'.,]+$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const DEFAULT_DESCRIPTION_SEPARATOR = " - ";

type NormalizedStatementImportCsvFormat = {
  hasHeader: boolean;
  delimitersToGuess: readonly string[];
  mappings: StatementImportCsvMappings;
  dateFormat: StatementImportCsvDateFormat;
  numberFormat: StatementImportCsvNumberFormat;
  orderedColumns:
    | readonly (typeof STATEMENT_IMPORT_CSV_HEADERS)[number][]
    | null;
};

type HeaderIndex = Map<string, number>;

export function parseStatementImportCsv(args: {
  text: string;
  currentAccount: CurrentAccountForStatementImport;
  format?: StatementImportCsvFormat;
}): StatementImportParseResult {
  const formatResult = normalizeStatementImportCsvFormat(
    args.format ?? DEFAULT_STATEMENT_IMPORT_CSV_FORMAT,
  );
  if (formatResult.errors.length > 0) {
    return { drafts: [], errors: formatResult.errors };
  }
  const format = formatResult.format;
  const minimumColumnCount = getMinimumColumnCount(format);
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

  const [firstRow, ...remainingRows] = parsed.data;
  if (!firstRow) {
    errors.unshift(getMissingCsvShapeMessage(format, minimumColumnCount));
    return { drafts: [], errors };
  }

  let headerRow: string[] | undefined;
  let headerIndex: HeaderIndex | undefined;
  const dataRows = format.hasHeader
    ? remainingRows.map((row, index) => ({
        row,
        sourceRowNumber: index + 2,
      }))
    : parsed.data.map((row, index) => ({
        row,
        sourceRowNumber: index + 1,
      }));

  if (format.hasHeader) {
    headerRow = firstRow;
    if (headerRow.length < minimumColumnCount) {
      errors.unshift(getMissingCsvShapeMessage(format, minimumColumnCount));
      return { drafts: [], errors };
    }
    if (
      format.orderedColumns &&
      isLikelyHeaderlessDataRow(headerRow, format, undefined)
    ) {
      errors.unshift("CSV must include a header row before transaction rows.");
      return { drafts: [], errors };
    }
    headerIndex = createHeaderIndex(headerRow);
    const headerErrors = validateMappedHeaders(format, headerIndex);
    if (headerErrors.length > 0) {
      return { drafts: [], errors: [...errors, ...headerErrors] };
    }
  }

  if (!format.hasHeader && firstRow.length < minimumColumnCount) {
    errors.unshift(getMissingCsvShapeMessage(format, minimumColumnCount));
    return { drafts: [], errors };
  }

  const rows = dataRows.filter(({ row }) =>
    rowHasMappedValues(row, format, headerIndex, minimumColumnCount),
  );
  if (rows.length === 0) {
    errors.push("CSV must contain at least one transaction row.");
  }

  const drafts: StatementImportDraft[] = [];
  rows.forEach(({ row, sourceRowNumber }) => {
    const rowShapeErrors = validateCsvRowShape({
      row,
      headerColumnCount: headerRow?.length,
      delimiter: parsed.meta.delimiter,
      format,
      minimumColumnCount,
      sourceRowNumber,
    });
    if (rowShapeErrors.length > 0) {
      errors.push(...rowShapeErrors);
      return;
    }

    const csvRowResult = toStatementImportCsvRow({
      row,
      format,
      headerIndex,
      sourceRowNumber,
    });
    if (csvRowResult.errors.length > 0) {
      errors.push(...csvRowResult.errors);
      return;
    }

    const csvRow = csvRowResult.row;
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

function normalizeStatementImportCsvFormat(format: StatementImportCsvFormat): {
  format: NormalizedStatementImportCsvFormat;
  errors: string[];
} {
  const errors: string[] = [];
  const columns = format.columns;
  const mappings =
    format.mappings ?? (columns ? createMappingsFromColumns(columns) : null);

  if (!mappings) {
    errors.push("CSV format must define either ordered columns or mappings.");
  } else {
    errors.push(...validateMappings(mappings, format.hasHeader));
  }

  return {
    format: {
      hasHeader: format.hasHeader,
      delimitersToGuess: format.delimitersToGuess,
      mappings:
        mappings ?? createMappingsFromColumns(STATEMENT_IMPORT_CSV_HEADERS),
      dateFormat: format.dateFormat ?? "yyyy-MM-dd",
      numberFormat: format.numberFormat ?? { decimalSeparator: "." },
      orderedColumns: format.mappings ? null : (columns ?? null),
    },
    errors,
  };
}

function createMappingsFromColumns(
  columns: readonly (typeof STATEMENT_IMPORT_CSV_HEADERS)[number][],
): StatementImportCsvMappings {
  const getOptionalColumnIndex = (
    column: (typeof STATEMENT_IMPORT_CSV_HEADERS)[number],
  ) => {
    const index = columns.indexOf(column);
    return index === -1 ? undefined : index;
  };

  return {
    date: columns.indexOf("date"),
    amount: {
      mode: "signed",
      column: columns.indexOf("amount"),
    },
    originalAmount: getOptionalColumnIndex("original amount"),
    originalCurrency: getOptionalColumnIndex("original currency"),
    exchangeRate: getOptionalColumnIndex("exchange rate"),
    description: getOptionalColumnIndex("description"),
  };
}

function validateMappings(
  mappings: StatementImportCsvMappings,
  hasHeader: boolean,
): string[] {
  const errors: string[] = [];
  const refs = collectColumnRefs(mappings);
  refs.forEach((ref) => {
    if (isHeaderRef(ref) && !hasHeader) {
      errors.push(
        `CSV format cannot use header column "${ref.header}" when hasHeader is false.`,
      );
    }
    const index = getColumnRefIndex(ref);
    if (index != null && (!Number.isInteger(index) || index < 0)) {
      errors.push("CSV format column indexes must be zero-based integers.");
    }
  });

  if (
    mappings.amount.mode === "debit-credit" &&
    mappings.amount.debitColumn == null &&
    mappings.amount.creditColumn == null
  ) {
    errors.push("CSV format must define a debit or credit column.");
  }

  return errors;
}

function collectColumnRefs(
  mappings: StatementImportCsvMappings,
): StatementImportCsvColumnRef[] {
  const refs: StatementImportCsvColumnRef[] = [mappings.date];
  const amountRefs =
    mappings.amount.mode === "signed"
      ? [mappings.amount.column]
      : [mappings.amount.debitColumn, mappings.amount.creditColumn];
  refs.push(...amountRefs.filter(isColumnRef));
  refs.push(
    ...[
      mappings.originalAmount,
      mappings.originalCurrency,
      mappings.exchangeRate,
    ].filter(isColumnRef),
  );

  if (mappings.description !== undefined) {
    if (isMultiColumnDescriptionMapping(mappings.description)) {
      refs.push(...mappings.description.columns);
    } else {
      refs.push(mappings.description);
    }
  }

  return refs;
}

function isColumnRef(
  ref: StatementImportCsvColumnRef | undefined,
): ref is StatementImportCsvColumnRef {
  return ref !== undefined;
}

function isHeaderRef(
  ref: StatementImportCsvColumnRef,
): ref is { header: string } {
  return typeof ref === "object" && "header" in ref;
}

function isMultiColumnDescriptionMapping(
  mapping: StatementImportCsvDescriptionMapping,
): mapping is {
  columns: readonly StatementImportCsvColumnRef[];
  separator?: string;
} {
  return typeof mapping === "object" && "columns" in mapping;
}

function getColumnRefIndex(
  ref: StatementImportCsvColumnRef,
): number | undefined {
  if (typeof ref === "number") {
    return ref;
  }
  return "index" in ref ? ref.index : undefined;
}

function getMinimumColumnCount(
  format: NormalizedStatementImportCsvFormat,
): number {
  if (format.orderedColumns) {
    return format.orderedColumns.length;
  }

  const indexes = collectColumnRefs(format.mappings)
    .map(getColumnRefIndex)
    .filter((index): index is number => index != null);
  return indexes.length === 0 ? 0 : Math.max(...indexes) + 1;
}

function getMissingCsvShapeMessage(
  format: NormalizedStatementImportCsvFormat,
  minimumColumnCount: number,
): string {
  if (format.orderedColumns) {
    return `CSV must include at least ${minimumColumnCount} columns in this order: ${format.orderedColumns.join(", ")}`;
  }

  return `CSV must include at least ${minimumColumnCount} columns for the selected import format.`;
}

function createHeaderIndex(headerRow: string[]): HeaderIndex {
  return new Map(
    headerRow.map((header, index) => [normalizeHeaderName(header), index]),
  );
}

function normalizeHeaderName(value: string): string {
  return value.trim().toLowerCase();
}

function validateMappedHeaders(
  format: NormalizedStatementImportCsvFormat,
  headerIndex: HeaderIndex,
): string[] {
  return collectColumnRefs(format.mappings)
    .filter(isHeaderRef)
    .filter((ref) => !headerIndex.has(normalizeHeaderName(ref.header)))
    .map((ref) => `CSV header is missing mapped column "${ref.header}".`);
}

function getColumnValue(
  row: string[],
  ref: StatementImportCsvColumnRef | undefined,
  headerIndex: HeaderIndex | undefined,
): string {
  if (ref == null) {
    return "";
  }
  const index = resolveColumnIndex(ref, headerIndex);
  return index === -1 ? "" : (row[index] ?? "");
}

function resolveColumnIndex(
  ref: StatementImportCsvColumnRef,
  headerIndex: HeaderIndex | undefined,
): number {
  if (typeof ref === "number") {
    return ref;
  }
  if ("index" in ref) {
    return ref.index;
  }

  return headerIndex?.get(normalizeHeaderName(ref.header)) ?? -1;
}

function toStatementImportCsvRow(args: {
  row: string[];
  format: NormalizedStatementImportCsvFormat;
  headerIndex: HeaderIndex | undefined;
  sourceRowNumber: number;
}): { row: StatementImportCsvRow; errors: string[] } {
  const { format, headerIndex, row, sourceRowNumber } = args;
  const mappings = format.mappings;
  if (shouldUseLegacyOrderedRowMapping(format)) {
    return {
      row: {
        date: getColumnValue(row, mappings.date, headerIndex),
        amount:
          mappings.amount.mode === "signed"
            ? getColumnValue(row, mappings.amount.column, headerIndex)
            : "",
        "original amount": getColumnValue(
          row,
          mappings.originalAmount,
          headerIndex,
        ),
        "original currency": getColumnValue(
          row,
          mappings.originalCurrency,
          headerIndex,
        ),
        "exchange rate": getColumnValue(
          row,
          mappings.exchangeRate,
          headerIndex,
        ),
        description: getDescriptionValue(
          row,
          mappings.description,
          headerIndex,
        ),
      },
      errors: [],
    };
  }

  const errors: string[] = [];
  const date = normalizeDateValue({
    value: getColumnValue(row, mappings.date, headerIndex),
    format: format.dateFormat,
    sourceRowNumber,
  });
  const amount = normalizeAmountValue({
    mapping: mappings.amount,
    row,
    headerIndex,
    numberFormat: format.numberFormat,
    sourceRowNumber,
  });
  const originalAmount = normalizeOptionalNumberValue({
    value: getColumnValue(row, mappings.originalAmount, headerIndex),
    field: "original amount",
    numberFormat: format.numberFormat,
    sourceRowNumber,
  });

  errors.push(...date.errors, ...amount.errors, ...originalAmount.errors);

  return {
    row: {
      date: date.value,
      amount: amount.value,
      "original amount": originalAmount.value,
      "original currency": getColumnValue(
        row,
        mappings.originalCurrency,
        headerIndex,
      ),
      "exchange rate": getColumnValue(row, mappings.exchangeRate, headerIndex),
      description: getDescriptionValue(row, mappings.description, headerIndex),
    },
    errors,
  };
}

function shouldUseLegacyOrderedRowMapping(
  format: NormalizedStatementImportCsvFormat,
): boolean {
  return (
    format.orderedColumns != null &&
    format.dateFormat === "yyyy-MM-dd" &&
    format.numberFormat.decimalSeparator === "." &&
    format.numberFormat.thousandsSeparator == null
  );
}

function validateCsvRowShape(args: {
  row: string[];
  headerColumnCount: number | undefined;
  delimiter: string;
  format: NormalizedStatementImportCsvFormat;
  minimumColumnCount: number;
  sourceRowNumber: number;
}): string[] {
  const errors: string[] = [];
  if (args.row.length < args.minimumColumnCount) {
    errors.push(
      `Row ${args.sourceRowNumber}: CSV row must include at least ${args.minimumColumnCount} columns.`,
    );
  }
  if (
    args.headerColumnCount != null &&
    args.row.length > args.headerColumnCount
  ) {
    errors.push(
      `Row ${args.sourceRowNumber}: CSV row has more columns than the header row; check for unquoted delimiters in values.`,
    );
  }
  if (
    args.delimiter === "," &&
    args.row.length > args.minimumColumnCount &&
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
  format: NormalizedStatementImportCsvFormat,
): boolean {
  const exchangeRateColumnIndex = resolveColumnIndex(
    format.mappings.exchangeRate ?? -1,
    undefined,
  );
  const descriptionMapping = format.mappings.description ?? -1;
  const descriptionColumnIndex = isMultiColumnDescriptionMapping(
    descriptionMapping,
  )
    ? -1
    : resolveColumnIndex(descriptionMapping, undefined);
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
  format: NormalizedStatementImportCsvFormat,
  headerIndex: HeaderIndex | undefined,
): boolean {
  const candidate = toStatementImportCsvRow({
    row,
    format,
    headerIndex,
    sourceRowNumber: 1,
  }).row;
  const date = candidate.date.trim();
  const amount = candidate.amount.trim();
  return (
    parseUtcDayDate(date) != null ||
    DATE_LIKE_PATTERN.test(date) ||
    STRICT_DECIMAL_PATTERN.test(amount) ||
    (NUMBER_LIKE_PATTERN.test(amount) && /\d/.test(amount))
  );
}

function rowHasMappedValues(
  row: string[],
  format: NormalizedStatementImportCsvFormat,
  headerIndex: HeaderIndex | undefined,
  minimumColumnCount: number,
): boolean {
  if (format.orderedColumns) {
    return row
      .slice(0, minimumColumnCount)
      .some((value) => value?.trim() !== "");
  }

  return collectColumnRefs(format.mappings).some(
    (ref) => getColumnValue(row, ref, headerIndex).trim() !== "",
  );
}

function normalizeDateValue(args: {
  value: string;
  format: StatementImportCsvDateFormat;
  sourceRowNumber: number;
}): { value: string; errors: string[] } {
  const trimmed = args.value.trim();
  const date = parseDateWithFormat(trimmed, args.format);
  if (!date) {
    return {
      value: trimmed,
      errors: [`Row ${args.sourceRowNumber}: date must match ${args.format}.`],
    };
  }

  return { value: date.toISOString().slice(0, 10), errors: [] };
}

function parseDateWithFormat(
  value: string,
  format: StatementImportCsvDateFormat,
): Date | null {
  if (format === "yyyy-MM-dd") {
    return parseUtcDayDate(value);
  }

  const match =
    format === "dd.MM.yyyy"
      ? /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(value)
      : /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (!match) {
    return null;
  }

  const first = Number(match[1]);
  const second = Number(match[2]);
  const year = Number(match[3]);
  return format === "dd.MM.yyyy"
    ? createUtcDateFromParts({ year, month: second, day: first })
    : createUtcDateFromParts({ year, month: first, day: second });
}

function createUtcDateFromParts(args: {
  year: number;
  month: number;
  day: number;
}): Date | null {
  const date = new Date(Date.UTC(args.year, args.month - 1, args.day));
  return date.getUTCFullYear() === args.year &&
    date.getUTCMonth() === args.month - 1 &&
    date.getUTCDate() === args.day
    ? date
    : null;
}

function normalizeAmountValue(args: {
  mapping: StatementImportCsvAmountMapping;
  row: string[];
  headerIndex: HeaderIndex | undefined;
  numberFormat: StatementImportCsvNumberFormat;
  sourceRowNumber: number;
}): { value: string; errors: string[] } {
  if (args.mapping.mode === "signed") {
    const parsed = normalizeNumberValue({
      value: getColumnValue(args.row, args.mapping.column, args.headerIndex),
      field: "amount",
      numberFormat: args.numberFormat,
      sourceRowNumber: args.sourceRowNumber,
      required: true,
    });
    if (parsed.errors.length > 0) {
      return parsed;
    }

    return {
      value: args.mapping.invertSign
        ? invertCanonicalNumberText(parsed.value)
        : parsed.value,
      errors: [],
    };
  }

  const debit = normalizeOptionalNumberValue({
    value: getColumnValue(args.row, args.mapping.debitColumn, args.headerIndex),
    field: "debit",
    numberFormat: args.numberFormat,
    sourceRowNumber: args.sourceRowNumber,
  });
  const credit = normalizeOptionalNumberValue({
    value: getColumnValue(
      args.row,
      args.mapping.creditColumn,
      args.headerIndex,
    ),
    field: "credit",
    numberFormat: args.numberFormat,
    sourceRowNumber: args.sourceRowNumber,
  });
  const errors = [...debit.errors, ...credit.errors];
  const debitAmount = debit.value === "" ? 0 : Number(debit.value);
  const creditAmount = credit.value === "" ? 0 : Number(credit.value);
  const hasDebit = Math.abs(debitAmount) > 0;
  const hasCredit = Math.abs(creditAmount) > 0;

  if (hasDebit && hasCredit) {
    errors.push(
      `Row ${args.sourceRowNumber}: debit and credit cannot both be set.`,
    );
  }
  if (!hasDebit && !hasCredit) {
    errors.push(
      `Row ${args.sourceRowNumber}: debit or credit amount is required.`,
    );
  }

  return {
    value: hasDebit
      ? toAbsoluteCanonicalNumberText(debit.value)
      : negateCanonicalNumberText(credit.value),
    errors,
  };
}

function normalizeOptionalNumberValue(args: {
  value: string;
  field: string;
  numberFormat: StatementImportCsvNumberFormat;
  sourceRowNumber: number;
}): { value: string; errors: string[] } {
  return normalizeNumberValue({ ...args, required: false });
}

function normalizeNumberValue(args: {
  value: string;
  field: string;
  numberFormat: StatementImportCsvNumberFormat;
  sourceRowNumber: number;
  required: boolean;
}): { value: string; errors: string[] } {
  const trimmed = args.value.trim();
  if (!trimmed && !args.required) {
    return { value: "", errors: [] };
  }

  const normalized = normalizeNumberText(trimmed, args.numberFormat);
  if (!normalized || !STRICT_DECIMAL_PATTERN.test(normalized)) {
    return {
      value: normalized ?? trimmed,
      errors: [
        `Row ${args.sourceRowNumber}: ${args.field} must be a valid number.`,
      ],
    };
  }

  const number = Number(normalized);
  if (!Number.isFinite(number)) {
    return {
      value: normalized,
      errors: [`Row ${args.sourceRowNumber}: ${args.field} must be finite.`],
    };
  }

  return { value: normalized, errors: [] };
}

function normalizeNumberText(
  value: string,
  format: StatementImportCsvNumberFormat,
): string | null {
  let normalized = value.replace(/\u00a0/g, " ").trim();
  const thousandsSeparator = format.thousandsSeparator;
  if (thousandsSeparator) {
    normalized = normalized.split(thousandsSeparator).join("");
  }

  if (format.decimalSeparator === ",") {
    if (normalized.includes(".")) {
      return null;
    }
    normalized = normalized.replace(",", ".");
  } else if ((normalized.match(/\./g) ?? []).length > 1) {
    return null;
  }

  if ((normalized.match(/,/g) ?? []).length > 0) {
    return null;
  }

  return normalized;
}

function toAbsoluteCanonicalNumberText(value: string): string {
  return value.startsWith("-") ? value.slice(1) : value;
}

function negateCanonicalNumberText(value: string): string {
  const absoluteValue = toAbsoluteCanonicalNumberText(value);
  return Number(absoluteValue) === 0 ? "0" : `-${absoluteValue}`;
}

function invertCanonicalNumberText(value: string): string {
  return value.startsWith("-")
    ? toAbsoluteCanonicalNumberText(value)
    : negateCanonicalNumberText(value);
}

function getDescriptionValue(
  row: string[],
  mapping: StatementImportCsvDescriptionMapping | undefined,
  headerIndex: HeaderIndex | undefined,
): string {
  if (mapping == null) {
    return "";
  }

  if (!isMultiColumnDescriptionMapping(mapping)) {
    return getColumnValue(row, mapping, headerIndex);
  }

  const separator = mapping.separator ?? DEFAULT_DESCRIPTION_SEPARATOR;
  return mapping.columns
    .map((column) => getColumnValue(row, column, headerIndex).trim())
    .filter(Boolean)
    .join(separator);
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
