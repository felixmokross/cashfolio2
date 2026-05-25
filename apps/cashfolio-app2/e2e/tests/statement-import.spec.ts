import { Buffer } from "node:buffer";
import { Unit } from "../../src/.prisma-client/enums";
import {
  agGridCellByColId,
  agGridRowByText,
  setGridAccountTreeCellValue,
} from "../support/grid";
import {
  getTransactionBookingsByDescription,
  seedDatabase,
  type SeededData,
} from "../support/db";
import { expect, test } from "../support/fixtures";

let seeded: SeededData;

test.beforeAll(async ({ e2eExternalId }) => {
  seeded = await seedDatabase({ userExternalId: e2eExternalId });
});

test("imports a statement after selecting the counter account in the review grid", async ({
  page,
}) => {
  const importedDescription = "E2E Statement Import Lunch";
  const csv = [
    "Booked;Cashflow;Original;Currency;Rate;Text;Ignored",
    `2026-05-14;-42.55;;;not-a-rate;${importedDescription};extra value`,
  ].join("\n");

  await page.goto(`/${seeded.accountBookId}/${seeded.cashAccount.id}`);
  await page.getByRole("button", { name: "Import Statement" }).click();

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
    new RegExp(`/${seeded.accountBookId}/${seeded.cashAccount.id}`),
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
