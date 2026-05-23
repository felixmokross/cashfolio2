import { expect, type Locator, type Page } from "@playwright/test";
import { agGridCellByColId, agGridRowByText, clickRowAction } from "./grid";

export function simpleCreateDialog(page: Page): Locator {
  return page.getByRole("dialog", { name: "Add Transaction" }).filter({
    has: page.getByRole("button", { name: "Switch to Split Editor" }),
  });
}

export function splitCreateDialog(page: Page): Locator {
  return page.getByRole("dialog", { name: "Add Transaction" }).filter({
    has: page.getByRole("button", { name: "Add Booking" }),
  });
}

async function opensWithin(
  locator: Locator,
  timeout: number,
): Promise<boolean> {
  try {
    await expect(locator).toBeVisible({ timeout });
    return true;
  } catch {
    return false;
  }
}

async function openAddTransactionDialog(
  page: Page,
): Promise<"SIMPLE" | "SPLIT"> {
  const button = page.getByRole("button", { name: "Add Transaction" });
  await expect(button).toBeVisible();

  const simpleDialog = simpleCreateDialog(page);
  const splitDialog = splitCreateDialog(page);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await button.click();
    if (await opensWithin(simpleDialog, 1500)) {
      return "SIMPLE";
    }
    if (await opensWithin(splitDialog, 1500)) {
      return "SPLIT";
    }
  }

  await expect(simpleDialog.or(splitDialog)).toBeVisible();
  return (await simpleDialog.isVisible()) ? "SIMPLE" : "SPLIT";
}

export async function openCreateTransaction(page: Page): Promise<Locator> {
  const openedVariant = await openAddTransactionDialog(page);
  const splitDialog = splitCreateDialog(page);
  if (openedVariant === "SPLIT") {
    await expect(splitDialog).toBeVisible();
    return splitDialog;
  }

  const simpleDialog = simpleCreateDialog(page);
  await simpleDialog
    .getByRole("button", { name: "Switch to Split Editor" })
    .click();
  await expect(simpleDialog).toHaveCount(0);
  await expect(splitDialog).toBeVisible();
  return splitDialog;
}

export async function openCreateSimpleTransaction(
  page: Page,
): Promise<Locator> {
  const openedVariant = await openAddTransactionDialog(page);
  expect(openedVariant).toBe("SIMPLE");
  const simpleDialog = simpleCreateDialog(page);
  await expect(simpleDialog).toBeVisible();
  return simpleDialog;
}

export async function fillTransactionHeader(
  dialog: Locator,
  description: string,
) {
  await dialog.getByLabel("Date").fill("01/01/2026");
  await dialog.getByLabel("Description").fill(description);
}

export async function openEditTransaction(page: Page, description: string) {
  const row = agGridRowByText(page, description);
  await clickRowAction(row, "Edit");
  await expect(
    page.getByRole("heading", { name: "Edit Transaction" }),
  ).toBeVisible();
}

export function gridRowByIndex(root: Locator, rowIndex: number): Locator {
  return root
    .locator(`.ag-center-cols-container .ag-row[row-index="${rowIndex}"]`)
    .first();
}

function normalizeCellText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function accountOptionNameRegex(name: string): RegExp {
  return new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

function accountLeafOption(page: Page, name: string): Locator {
  return page
    .getByRole("option", {
      name: accountOptionNameRegex(name),
    })
    .filter({ hasNot: page.getByRole("button") })
    .first();
}

async function searchFocusedAccountTree(page: Page, name: string) {
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(name);
}

export async function selectAccountLeaf(page: Page, name: string) {
  await searchFocusedAccountTree(page, name);
  const option = accountLeafOption(page, name);
  await expect(option).toBeVisible();
  await option.click();
}

export async function expectAccountLeafSearchResult(args: {
  input: Locator;
  page: Page;
  accountName: string;
  visible: boolean;
}) {
  await args.input.click();
  await searchFocusedAccountTree(args.page, args.accountName);

  const option = accountLeafOption(args.page, args.accountName);
  if (args.visible) {
    await expect(option).toBeVisible();
  } else {
    await expect(option).toHaveCount(0);
  }
}

export async function setGridAccountCellValue(args: {
  dialog: Locator;
  rowIndex: number;
  accountName: string;
}) {
  const cell = args.dialog
    .locator(
      `.ag-center-cols-container .ag-row[row-index="${args.rowIndex}"] [col-id="account"]`,
    )
    .first();

  await expect(cell).toBeVisible();
  await cell.click({ force: true });

  let editorInput = args.dialog
    .locator(".ag-cell-inline-editing input:not([type='hidden'])")
    .first();
  if (!(await editorInput.isVisible())) {
    await cell.press("Enter");
    editorInput = args.dialog
      .locator(".ag-cell-inline-editing input:not([type='hidden'])")
      .first();
  }

  await expect(editorInput).toBeVisible();
  await editorInput.fill(args.accountName);

  const option = accountLeafOption(args.dialog.page(), args.accountName);
  await expect(option).toBeVisible({ timeout: 3000 });
  await option.click();
  await args.dialog.page().keyboard.press("Enter");
}

export async function setUnitlessEquityAccountOnEditableRow(args: {
  dialog: Locator;
  accountName: string;
}): Promise<{ editedRowIndex: number; lockedRowIndex: number }> {
  const visibleRowIndexes = async (): Promise<number[]> => {
    const rows = args.dialog.locator(".ag-center-cols-container .ag-row");
    const rowCount = await rows.count();
    const indexes = new Set<number>();
    for (let i = 0; i < rowCount; i += 1) {
      const rowIndex = await rows.nth(i).getAttribute("row-index");
      if (rowIndex == null) {
        continue;
      }
      const parsed = Number(rowIndex);
      if (!Number.isNaN(parsed)) {
        indexes.add(parsed);
      }
    }
    return [...indexes].sort((a, b) => a - b);
  };

  const accountContains = async (rowIndex: number) =>
    normalizeCellText(
      await agGridCellByColId(
        gridRowByIndex(args.dialog, rowIndex),
        "account",
      ).innerText(),
    ).includes(args.accountName);

  const rowIndexes = await visibleRowIndexes();
  for (const rowIndex of rowIndexes) {
    try {
      await setGridAccountCellValue({
        dialog: args.dialog,
        rowIndex,
        accountName: args.accountName,
      });
      await expect
        .poll(async () => accountContains(rowIndex), { timeout: 3000 })
        .toBe(true);
      if (await accountContains(rowIndex)) {
        const lockedRowIndex =
          rowIndexes.find((candidateIndex) => candidateIndex !== rowIndex) ??
          rowIndex;
        return {
          editedRowIndex: rowIndex,
          lockedRowIndex,
        };
      }
    } catch {
      // Try the other row if this one is non-editable in the current ordering.
    }
  }

  throw new Error("Could not set unitless equity account on an editable row");
}
