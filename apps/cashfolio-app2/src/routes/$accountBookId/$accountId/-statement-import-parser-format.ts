import {
  STATEMENT_IMPORT_CSV_HEADERS,
  type StatementImportCsvColumnRef,
  type StatementImportCsvDateFormat,
  type StatementImportCsvDescriptionMapping,
  type StatementImportCsvFormat,
  type StatementImportCsvMappings,
  type StatementImportCsvNumberFormat,
} from "./-statement-import-types";

export type NormalizedStatementImportCsvFormat = {
  hasHeader: boolean;
  delimitersToGuess: readonly string[];
  mappings: StatementImportCsvMappings;
  dateFormat: StatementImportCsvDateFormat;
  numberFormat: StatementImportCsvNumberFormat;
  orderedColumns:
    | readonly (typeof STATEMENT_IMPORT_CSV_HEADERS)[number][]
    | null;
};

export type HeaderIndex = Map<string, number>;

export function normalizeStatementImportCsvFormat(
  format: StatementImportCsvFormat,
): {
  format: NormalizedStatementImportCsvFormat;
  errors: string[];
} {
  const errors: string[] = [];
  const columns = format.columns;
  const mappings =
    format.mappings ?? (columns ? createMappingsFromColumns(columns) : null);
  const numberFormat = format.numberFormat ?? { decimalSeparator: "." };

  if (!mappings) {
    errors.push("CSV format must define either ordered columns or mappings.");
  } else {
    errors.push(...validateMappings(mappings, format.hasHeader));
  }
  errors.push(...validateNumberFormat(numberFormat));

  return {
    format: {
      hasHeader: format.hasHeader,
      delimitersToGuess: format.delimitersToGuess,
      mappings:
        mappings ?? createMappingsFromColumns(STATEMENT_IMPORT_CSV_HEADERS),
      dateFormat: format.dateFormat ?? "yyyy-MM-dd",
      numberFormat,
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

function validateNumberFormat(
  numberFormat: StatementImportCsvNumberFormat,
): string[] {
  if (
    numberFormat.thousandsSeparator != null &&
    numberFormat.decimalSeparator === numberFormat.thousandsSeparator
  ) {
    return ["CSV format decimal and thousands separators must be different."];
  }

  return [];
}

export function collectColumnRefs(
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

export function isHeaderRef(
  ref: StatementImportCsvColumnRef,
): ref is { header: string } {
  return typeof ref === "object" && "header" in ref;
}

export function isMultiColumnDescriptionMapping(
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

export function getMinimumColumnCount(
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

export function getMissingCsvShapeMessage(
  format: NormalizedStatementImportCsvFormat,
  minimumColumnCount: number,
): string {
  if (format.orderedColumns) {
    return `CSV must include at least ${minimumColumnCount} columns in this order: ${format.orderedColumns.join(", ")}`;
  }

  return `CSV must include at least ${minimumColumnCount} columns for the selected import format.`;
}

export function createHeaderIndex(headerRow: string[]): HeaderIndex {
  return new Map(
    headerRow.map((header, index) => [normalizeHeaderName(header), index]),
  );
}

function normalizeHeaderName(value: string): string {
  return value.trim().toLowerCase();
}

export function validateMappedHeaders(
  format: NormalizedStatementImportCsvFormat,
  headerIndex: HeaderIndex,
): string[] {
  return collectColumnRefs(format.mappings)
    .filter(isHeaderRef)
    .filter((ref) => !headerIndex.has(normalizeHeaderName(ref.header)))
    .map((ref) => `CSV header is missing mapped column "${ref.header}".`);
}

export function shouldRejectLikelyHeaderlessFirstRow(
  format: NormalizedStatementImportCsvFormat,
): boolean {
  return (
    format.orderedColumns != null ||
    collectColumnRefs(format.mappings).every((ref) => !isHeaderRef(ref))
  );
}

export function getColumnValue(
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

export function resolveColumnIndex(
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
