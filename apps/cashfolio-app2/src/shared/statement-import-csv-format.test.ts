import { describe, expect, test } from "vitest";
import {
  parseStatementImportCsvFormatJson,
  readStatementImportCsvFormat,
} from "./statement-import-csv-format";

describe("statement import CSV format validation", () => {
  test("accepts valid header-mapped formats", () => {
    const result = readStatementImportCsvFormat({
      hasHeader: true,
      delimitersToGuess: [";"],
      dateFormat: "dd.MM.yyyy",
      numberFormat: {
        decimalSeparator: ",",
        thousandsSeparator: "'",
      },
      mappings: {
        date: { header: "Date" },
        amount: { mode: "signed", column: { header: "Amount" } },
        description: { header: "Description" },
      },
    });

    expect(result.errors).toEqual([]);
    expect(result.format).toMatchObject({
      hasHeader: true,
      delimitersToGuess: [";"],
      dateFormat: "dd.MM.yyyy",
    });
  });

  test("preserves zero-valued column references", () => {
    const result = readStatementImportCsvFormat({
      hasHeader: false,
      delimitersToGuess: [","],
      mappings: {
        date: 0,
        amount: { mode: "signed", column: 0 },
        description: { columns: [0, 2] },
      },
    });

    expect(result.errors).toEqual([]);
    expect(result.format).toMatchObject({
      mappings: {
        date: 0,
        amount: { mode: "signed", column: 0 },
        description: { columns: [0, 2] },
      },
    });
  });

  test("rejects invalid JSON text", () => {
    const result = parseStatementImportCsvFormatJson("{not-json");

    expect(result.format).toBeNull();
    expect(result.errors).toContain(
      "Statement import CSV format must be valid JSON.",
    );
  });

  test("rejects invalid format shape", () => {
    const result = readStatementImportCsvFormat({
      hasHeader: "yes",
      delimitersToGuess: [],
      columns: ["date", "unsupported"],
    });

    expect(result.format).toBeNull();
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "CSV format hasHeader must be true or false.",
        "CSV format delimitersToGuess must be a non-empty string array.",
        "CSV format columns must use supported statement import fields.",
      ]),
    );
  });

  test("rejects identical decimal and thousands separators", () => {
    const result = readStatementImportCsvFormat({
      hasHeader: true,
      delimitersToGuess: [","],
      numberFormat: {
        decimalSeparator: ",",
        thousandsSeparator: ",",
      },
      columns: ["date", "amount", "description"],
    });

    expect(result.format).toBeNull();
    expect(result.errors).toContain(
      "CSV format decimal and thousands separators must be different.",
    );
  });

  test("rejects header refs when hasHeader is false", () => {
    const result = readStatementImportCsvFormat({
      hasHeader: false,
      delimitersToGuess: [","],
      mappings: {
        date: { header: "Date" },
        amount: { mode: "signed", column: 1 },
      },
    });

    expect(result.format).toBeNull();
    expect(result.errors).toContain(
      'CSV format cannot use header column "Date" when hasHeader is false.',
    );
  });
});
