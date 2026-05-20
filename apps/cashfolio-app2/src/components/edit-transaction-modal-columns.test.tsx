import { describe, expect, test } from "vitest";
import { AccountType, Unit } from "../.prisma-client/enums";
import { ACCOUNT_TREE_SELECT_COLUMN, SELECT_COLUMN } from "./column-types";
import {
  createEditTransactionColumnDefs,
  getMixedUnitAmountFooterLabel,
} from "./edit-transaction-modal-columns";
import type {
  AccountOption,
  BookingValues,
} from "./edit-transaction-modal-types";

const accounts: AccountOption[] = [
  {
    value: "account-checking",
    label: "Asset / Cash / Checking",
    treePath: ["Asset", "Cash"],
    treeLabel: "Checking",
    type: AccountType.ASSET,
    unit: Unit.CURRENCY,
    currency: "CHF",
  },
];

describe("createEditTransactionColumnDefs", () => {
  test("uses TreeSelect only for the booking account column", () => {
    const columnDefs = createEditTransactionColumnDefs({
      accounts,
      isSubmitting: false,
      accountBookStartDate: new Date("2026-01-04T00:00:00.000Z"),
      unitUsage: { currencies: ["CHF"], cryptocurrencies: ["BTC"] },
    });

    expect(columnDefs.find((column) => column.field === "account")?.type).toBe(
      ACCOUNT_TREE_SELECT_COLUMN,
    );
    expect(columnDefs.find((column) => column.field === "unit")?.type).toBe(
      SELECT_COLUMN,
    );
    expect(columnDefs.find((column) => column.colId === "ccy")?.type).toBe(
      SELECT_COLUMN,
    );
  });

  test("uses grouped account-book unit options for the currency column editor", () => {
    const columnDefs = createEditTransactionColumnDefs({
      accounts,
      isSubmitting: false,
      accountBookStartDate: new Date("2026-01-04T00:00:00.000Z"),
      unitUsage: { currencies: ["CHF", "USD"], cryptocurrencies: ["BTC"] },
    });
    const currencyColumn = columnDefs.find((column) => column.colId === "ccy");

    const currencyEditorParams = currencyColumn?.cellEditorParams?.({
      data: { key: "row-1", unit: Unit.CURRENCY, currency: "CHF" },
    });
    expect(currencyEditorParams?.options[0]).toEqual({
      group: "Used",
      items: [
        { value: "CHF", label: "CHF" },
        { value: "USD", label: "USD" },
      ],
    });

    const cryptocurrencyEditorParams = currencyColumn?.cellEditorParams?.({
      data: {
        key: "row-2",
        unit: Unit.CRYPTOCURRENCY,
        cryptocurrency: "BTC",
      },
    });
    expect(cryptocurrencyEditorParams?.options[0]).toEqual({
      group: "Used",
      items: [{ value: "BTC", label: "BTC" }],
    });
  });

  test("detects same-unit amount footers as numeric totals", () => {
    expect(
      getMixedUnitAmountFooterLabel({
        field: "debit",
        bookings: [
          {
            key: "row-1",
            unit: Unit.CURRENCY,
            currency: "CHF",
            debit: 10,
          },
          {
            key: "row-2",
            unit: Unit.CURRENCY,
            currency: "CHF",
            debit: 20,
          },
        ],
      }),
    ).toBeNull();
  });

  test("detects mixed-currency amount footers", () => {
    expect(
      getMixedUnitAmountFooterLabel({
        field: "debit",
        bookings: [
          {
            key: "row-1",
            unit: Unit.CURRENCY,
            currency: "CHF",
            debit: 10,
          },
          {
            key: "row-2",
            unit: Unit.CURRENCY,
            currency: "USD",
            debit: 20,
          },
        ],
      }),
    ).toBe("Mixed");
  });

  test("evaluates debit and credit footers independently", () => {
    const bookings: BookingValues[] = [
      {
        key: "row-1",
        unit: Unit.CURRENCY,
        currency: "CHF",
        debit: 10,
      },
      {
        key: "row-2",
        unit: Unit.CURRENCY,
        currency: "CHF",
        debit: 20,
      },
      {
        key: "row-3",
        unit: Unit.CURRENCY,
        currency: "CHF",
        credit: 5,
      },
      {
        key: "row-4",
        unit: Unit.CURRENCY,
        currency: "USD",
        credit: 5,
      },
    ];

    expect(
      getMixedUnitAmountFooterLabel({ field: "debit", bookings }),
    ).toBeNull();
    expect(getMixedUnitAmountFooterLabel({ field: "credit", bookings })).toBe(
      "Mixed",
    );
  });

  test("treats matching displayed currency with different unit identities as mixed", () => {
    expect(
      getMixedUnitAmountFooterLabel({
        field: "debit",
        bookings: [
          {
            key: "row-1",
            unit: Unit.CURRENCY,
            currency: "USD",
            debit: 10,
          },
          {
            key: "row-2",
            unit: Unit.SECURITY,
            symbol: "AAPL",
            tradeCurrency: "USD",
            debit: 1,
          },
        ],
      }),
    ).toBe("Mixed");
  });

  test("ignores rows without an amount in the footer column", () => {
    expect(
      getMixedUnitAmountFooterLabel({
        field: "debit",
        bookings: [
          {
            key: "row-1",
            unit: Unit.CURRENCY,
            currency: "USD",
          },
          {
            key: "row-2",
            unit: Unit.CURRENCY,
            currency: "CHF",
            debit: 10,
          },
        ],
      }),
    ).toBeNull();
  });

  test("treats amount rows with missing unit identity as mixed", () => {
    expect(
      getMixedUnitAmountFooterLabel({
        field: "debit",
        bookings: [
          {
            key: "row-1",
            unit: Unit.CURRENCY,
            debit: 0,
          },
          {
            key: "row-2",
            unit: Unit.CURRENCY,
            currency: "CHF",
            debit: 10,
          },
        ],
      }),
    ).toBe("Mixed");
  });

  test("uses a mixed marker renderer only for mixed pinned amount footers", () => {
    const columnDefs = createEditTransactionColumnDefs({
      accounts,
      isSubmitting: false,
      accountBookStartDate: new Date("2026-01-04T00:00:00.000Z"),
    });
    const debitColumn = columnDefs.find((column) => column.field === "debit");
    const creditColumn = columnDefs.find((column) => column.field === "credit");
    const mixedBookings: BookingValues[] = [
      {
        key: "row-1",
        unit: Unit.CURRENCY,
        currency: "CHF",
        debit: 10,
      },
      {
        key: "row-2",
        unit: Unit.CURRENCY,
        currency: "USD",
        debit: 20,
      },
    ];
    const mixedCreditBookings: BookingValues[] = [
      {
        key: "row-1",
        unit: Unit.CURRENCY,
        currency: "CHF",
        credit: 10,
      },
      {
        key: "row-2",
        unit: Unit.CURRENCY,
        currency: "USD",
        credit: 20,
      },
    ];
    const sameUnitBookings: BookingValues[] = [
      {
        key: "row-1",
        unit: Unit.CURRENCY,
        currency: "CHF",
        debit: 10,
      },
      {
        key: "row-2",
        unit: Unit.CURRENCY,
        currency: "CHF",
        debit: 20,
      },
    ];

    const mixedRenderer = debitColumn?.cellRendererSelector?.({
      context: { form: { values: { bookings: mixedBookings } } },
      node: { rowPinned: "bottom" },
    } as never);
    expect(mixedRenderer?.component()).toBe("Mixed");

    const mixedCreditRenderer = creditColumn?.cellRendererSelector?.({
      context: { form: { values: { bookings: mixedCreditBookings } } },
      node: { rowPinned: "bottom" },
    } as never);
    expect(mixedCreditRenderer?.component()).toBe("Mixed");

    expect(
      debitColumn?.cellRendererSelector?.({
        context: { form: { values: { bookings: sameUnitBookings } } },
        node: { rowPinned: "bottom" },
      } as never),
    ).toBeUndefined();

    expect(
      debitColumn?.cellRendererSelector?.({
        context: { form: { values: { bookings: mixedBookings } } },
        node: { rowPinned: undefined },
      } as never),
    ).toBeUndefined();
  });
});
