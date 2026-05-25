import { Buffer } from "node:buffer";
import type { Page } from "@playwright/test";
import { Unit } from "../../src/.prisma-client/enums";
import {
  agGridCellByColId,
  agGridRowByText,
  clickPinnedRowAction,
  setGridCellValue,
  setGridAccountTreeCellValue,
} from "../support/grid";
import {
  countTransactionsByDescription,
  getTransactionBookingsByDescription,
  seedDatabase,
  type SeededData,
} from "../support/db";
import { expect, test } from "../support/fixtures";
import { setGridAccountCellValue } from "../support/transaction-form";

let seeded: SeededData;

test.beforeAll(async ({ e2eExternalId }) => {
  seeded = await seedDatabase({ userExternalId: e2eExternalId });
});

async function openStatementImportPage(page: Page) {
  await page.getByRole("button", { name: "Account actions" }).click();
  await page.getByRole("menuitem", { name: "Import Statement" }).click();
}

function ledgerUrlPattern(args: { accountBookId: string; accountId: string }) {
  return new RegExp(`/${args.accountBookId}/${args.accountId}(?:[?]|$)`);
}

test("imports a statement after selecting the counter account in the review grid", async ({
  page,
}) => {
  const importedDescription = "E2E Statement Import Lunch";
  const csv = [
    "Booked;Cashflow;Original;Currency;Rate;Text;Ignored",
    `2026-05-14;-42.55;;;not-a-rate;${importedDescription};extra value`,
  ].join("\n");

  await page.goto(
    `/${seeded.accountBookId}/${seeded.cashAccount.id}?period=2026-04`,
  );
  await openStatementImportPage(page);

  await expect(page).toHaveURL(
    new RegExp(
      `/${seeded.accountBookId}/${seeded.cashAccount.id}/import-statement`,
    ),
  );
  await expect(
    page.getByRole("heading", { name: "Import Statement" }),
  ).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: "statement-import.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });

  await expect(page.getByText("0 of 1 ready")).toBeVisible();
  const draftRow = agGridRowByText(page, importedDescription);
  await expect(draftRow).toBeVisible();
  await expect(agGridCellByColId(draftRow, "status")).toContainText(
    "Needs edit",
  );
  await expect(
    page.getByRole("button", { name: "Import Transactions" }),
  ).toBeDisabled();

  await setGridAccountTreeCellValue({
    root: page,
    rowIndex: 0,
    colId: "counterAccountId",
    accountName: seeded.expenseAccount.name,
  });

  await expect(agGridCellByColId(draftRow, "counterAccountId")).toContainText(
    seeded.expenseAccount.name,
  );
  await expect(agGridCellByColId(draftRow, "status")).toContainText("Ready");
  await expect(page.getByText("1 of 1 ready")).toBeVisible();

  await page.getByRole("button", { name: "Import Transactions" }).click();

  await expect(page).toHaveURL(
    ledgerUrlPattern({
      accountBookId: seeded.accountBookId,
      accountId: seeded.cashAccount.id,
    }),
  );
  await expect(agGridRowByText(page, importedDescription)).toBeVisible();

  const ledgerUrl = new URL(page.url());
  expect(ledgerUrl.searchParams.get("period")).toBe("2026-05");
  expect(ledgerUrl.searchParams.get("transactionId")).toBeTruthy();

  const bookings = await getTransactionBookingsByDescription({
    accountBookId: seeded.accountBookId,
    description: importedDescription,
  });
  expect(bookings).toHaveLength(2);
  expect(bookings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        accountId: seeded.cashAccount.id,
        unit: Unit.CURRENCY,
        symbol: null,
        tradeCurrency: null,
        value: -42.55,
      }),
      expect.objectContaining({
        accountId: seeded.expenseAccount.id,
        unit: Unit.CURRENCY,
        symbol: null,
        tradeCurrency: null,
        value: 42.55,
      }),
    ]),
  );
});

test("shows multiple for drafts with several counter bookings", async ({
  page,
}) => {
  const importedDescription = "E2E Statement Import Multiple";
  const csv = [
    "Booked;Cashflow;Original;Currency;Rate;Text;Ignored",
    `2026-05-15;-42.55;;;ignored;${importedDescription};extra value`,
  ].join("\n");

  await page.goto(
    `/${seeded.accountBookId}/${seeded.cashAccount.id}?period=2026-04`,
  );
  await openStatementImportPage(page);

  await page.locator('input[type="file"]').setInputFiles({
    name: "statement-import-multiple.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });

  const draftRow = agGridRowByText(page, importedDescription);
  await expect(draftRow).toBeVisible();
  await clickPinnedRowAction({
    row: draftRow,
    actionLabel: "Edit Imported Transaction",
  });

  const editDialog = page.getByRole("dialog", {
    name: "Edit Imported Transaction",
  });
  await expect(editDialog).toBeVisible();
  await setGridAccountCellValue({
    dialog: editDialog,
    rowIndex: 1,
    accountName: seeded.savingsAccount.name,
  });
  await setGridCellValue(editDialog, 1, "debit", "30");
  await editDialog.getByRole("button", { name: "Add Booking" }).click();
  await setGridCellValue(editDialog, 2, "date", "05/15/2026");
  await setGridAccountCellValue({
    dialog: editDialog,
    rowIndex: 2,
    accountName: seeded.investmentsAccount.name,
  });
  await setGridCellValue(editDialog, 2, "debit", "12.55");
  await editDialog.getByRole("button", { name: "Save Draft" }).click();
  await expect(editDialog).toHaveCount(0);

  const counterCell = agGridCellByColId(draftRow, "counterAccountId");
  await expect(counterCell).toContainText("Multiple");
  await expect(agGridCellByColId(draftRow, "status")).toContainText("Ready");

  await counterCell.dblclick();
  await expect(page.locator(".ag-cell-inline-editing")).toHaveCount(0);

  await page.getByRole("button", { name: "Import Transactions" }).click();
  await expect(page).toHaveURL(
    ledgerUrlPattern({
      accountBookId: seeded.accountBookId,
      accountId: seeded.cashAccount.id,
    }),
  );
  await expect(agGridRowByText(page, importedDescription)).toBeVisible();

  const bookings = await getTransactionBookingsByDescription({
    accountBookId: seeded.accountBookId,
    description: importedDescription,
  });
  expect(bookings).toHaveLength(3);
  expect(bookings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        accountId: seeded.cashAccount.id,
        value: -42.55,
      }),
      expect.objectContaining({
        accountId: seeded.savingsAccount.id,
        value: 30,
      }),
      expect.objectContaining({
        accountId: seeded.investmentsAccount.id,
        value: 12.55,
      }),
    ]),
  );
});

test("keeps ignored statement rows visible and skips them during import", async ({
  page,
}) => {
  const importedDescription = "E2E Statement Import Included";
  const ignoredDescription = "E2E Statement Import Ignored";
  const csv = [
    "Booked;Cashflow;Original;Currency;Rate;Text;Ignored",
    `2026-05-16;-12.35;;;ignored;${importedDescription};extra value`,
    `2026-05-17;-98.75;;;ignored;${ignoredDescription};extra value`,
  ].join("\n");

  await page.goto(
    `/${seeded.accountBookId}/${seeded.cashAccount.id}?period=2026-04`,
  );
  await openStatementImportPage(page);

  await page.locator('input[type="file"]').setInputFiles({
    name: "statement-import-ignore.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });

  const includedRow = agGridRowByText(page, importedDescription);
  const ignoredRow = agGridRowByText(page, ignoredDescription);
  await expect(includedRow).toBeVisible();
  await expect(ignoredRow).toBeVisible();

  await clickPinnedRowAction({
    row: ignoredRow,
    actionLabel: "Ignore Imported Transaction",
  });
  await expect(agGridCellByColId(ignoredRow, "status")).toContainText(
    "Ignored",
  );
  await expect(page.getByText("0 of 2 ready, 1 ignored")).toBeVisible();

  await clickPinnedRowAction({
    row: ignoredRow,
    actionLabel: "Unignore Imported Transaction",
  });
  await expect(agGridCellByColId(ignoredRow, "status")).toContainText(
    "Needs edit",
  );

  await clickPinnedRowAction({
    row: ignoredRow,
    actionLabel: "Ignore Imported Transaction",
  });
  await expect(ignoredRow).toBeVisible();

  await setGridAccountTreeCellValue({
    root: page,
    rowIndex: 0,
    colId: "counterAccountId",
    accountName: seeded.expenseAccount.name,
  });

  await expect(agGridCellByColId(includedRow, "status")).toContainText("Ready");
  await expect(page.getByText("1 of 2 ready, 1 ignored")).toBeVisible();

  await page.getByRole("button", { name: "Import Transactions" }).click();
  await expect(page).toHaveURL(
    ledgerUrlPattern({
      accountBookId: seeded.accountBookId,
      accountId: seeded.cashAccount.id,
    }),
  );
  await expect(agGridRowByText(page, importedDescription)).toBeVisible();

  const includedBookings = await getTransactionBookingsByDescription({
    accountBookId: seeded.accountBookId,
    description: importedDescription,
  });
  expect(includedBookings).toHaveLength(2);

  const ignoredTransactionCount = await countTransactionsByDescription({
    accountBookId: seeded.accountBookId,
    description: ignoredDescription,
  });
  expect(ignoredTransactionCount).toBe(0);
});
