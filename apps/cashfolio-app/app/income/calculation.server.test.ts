import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  completeFxTransaction,
  generateFxBookingsForFxAccount,
  getBalanceByDate,
  getIncomeData,
} from "./calculation.server";
import {
  buildAccount,
  buildAccountGroup,
  buildAccountWithBookings,
  buildBooking,
  buildTransactionWithBookings,
} from "../builders";
import { AccountType, Prisma } from "@prisma/client";
import { formatISODate } from "~/formatting";
import { getExchangeRate, type Unit } from "~/fx.server";

const mockGetExchangeRate = vi.fn();

vi.mock("~/fx.server", async () => ({
  convert,
  getExchangeRate: (...args: Parameters<typeof mockGetExchangeRate>) =>
    mockGetExchangeRate(...args),
}));

// needs to be redefined, because the real function will not use the mocked 'getExchangeRate' since it is in the same module
async function convert(
  value: Prisma.Decimal,
  sourceUnit: Unit,
  targetUnit: Unit,
  date: Date,
) {
  return (await getExchangeRate(sourceUnit, targetUnit, date)).mul(value);
}

beforeEach(() => {
  mockGetExchangeRate.mockReset();
});

describe("getBalanceByDate", () => {
  test("returns the balance by date", () => {
    const result = getBalanceByDate({
      ...buildAccount({ id: "account_1" }),
      bookings: [
        buildBooking({
          date: new Date("2024-12-31"),
          value: new Prisma.Decimal(1000),
        }),
        buildBooking({
          date: new Date("2025-01-02"),
          value: new Prisma.Decimal(-200),
        }),
        buildBooking({
          date: new Date("2025-01-02"),
          value: new Prisma.Decimal(50),
        }),
        buildBooking({
          date: new Date("2025-01-03"),
          value: new Prisma.Decimal(100),
        }),
      ],
    });

    expect(result).toEqual(
      new Map<string, Prisma.Decimal>([
        ["2024-12-31", new Prisma.Decimal(1000)],
        ["2025-01-02", new Prisma.Decimal(850)],
        ["2025-01-03", new Prisma.Decimal(950)],
      ]),
    );
  });
});

describe("generateFxBookingsForFxAccount", () => {
  test("returns FX bookings for an FX account", async () => {
    const fxRates = {
      "2024-12-31_EUR_CHF": new Prisma.Decimal(1.1),
      "2025-01-01_EUR_CHF": new Prisma.Decimal(1.2),
      "2025-01-02_EUR_CHF": new Prisma.Decimal(1.3),
      "2025-01-03_EUR_CHF": new Prisma.Decimal(1.2),
      "2025-01-04_EUR_CHF": new Prisma.Decimal(0.95),
    };

    async function getFxRate(
      date: Date,
      from: Unit,
      to: Unit,
    ): Promise<Prisma.Decimal> {
      if (from.unit !== "CURRENCY") throw new Error("Only currency supported");
      if (to.unit !== "CURRENCY") throw new Error("Only currency supported");

      const key = `${formatISODate(date)}_${from.currency}_${to.currency}`;
      if (!(key in fxRates)) throw new Error(`Unexpected FX rate: ${key}`);

      return fxRates[key as keyof typeof fxRates];
    }

    mockGetExchangeRate.mockImplementation((from: Unit, to: Unit, date: Date) =>
      getFxRate(date, from, to),
    );

    const result = await generateFxBookingsForFxAccount(
      {
        ...buildAccount({ id: "fx-account", currency: "EUR" }),
        bookings: [
          buildBooking({
            date: new Date("2024-12-31"),
            value: new Prisma.Decimal(1000),
          }),

          buildBooking({
            date: new Date("2025-01-03"),
            value: new Prisma.Decimal(-100),
          }),
        ],
      },
      new Date("2025-01-04"),
    );

    expect(result).toEqual([
      expect.objectContaining({
        date: new Date("2025-01-01"),
        value: new Prisma.Decimal(-100),
      }),
      expect.objectContaining({
        date: new Date("2025-01-02"),
        value: new Prisma.Decimal(-100),
      }),
      expect.objectContaining({
        date: new Date("2025-01-03"),
        value: new Prisma.Decimal(100),
      }),
      expect.objectContaining({
        date: new Date("2025-01-04"),
        value: new Prisma.Decimal(225),
      }),
    ]);
  });

  test("returns an empty array if there is no booking", async () => {
    const result = await generateFxBookingsForFxAccount(
      {
        ...buildAccount({ id: "fx-account", currency: "EUR" }),
        bookings: [],
      },
      new Date("2025-01-04"),
    );

    expect(result).toEqual([]);
  });
});

describe("completeFxTransaction", () => {
  test("completes an FX transaction", async () => {
    const fxRates = {
      "2025-01-03_EUR_CHF": new Prisma.Decimal(0.9),
    };

    async function getFxRate(
      date: Date,
      from: Unit,
      to: Unit,
    ): Promise<Prisma.Decimal> {
      if (from.unit !== "CURRENCY") throw new Error("Only currency supported");
      if (to.unit !== "CURRENCY") throw new Error("Only currency supported");

      if (from.currency === to.currency) {
        return new Prisma.Decimal(1);
      }

      const key = `${formatISODate(date)}_${from.currency}_${to.currency}`;
      if (!(key in fxRates)) throw new Error(`Unexpected FX rate: ${key}`);

      return fxRates[key as keyof typeof fxRates];
    }

    mockGetExchangeRate.mockImplementation((from: Unit, to: Unit, date: Date) =>
      getFxRate(date, from, to),
    );

    const result = await completeFxTransaction({
      id: "transaction_1",
      description: "FX transaction",
      bookings: [
        buildBooking({
          id: "booking_1",
          accountId: "account_1",
          date: new Date("2025-01-03"),
          value: new Prisma.Decimal(-100),
          currency: "EUR",
        }),
        buildBooking({
          id: "booking_2",
          date: new Date("2025-01-04"),
          accountId: "account_2",
          value: new Prisma.Decimal(88),
          currency: "CHF",
        }),
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(result).toEqual(new Prisma.Decimal(2));
  });
});

describe("getProfitLossStatement", () => {
  test("generates the profit/loss statement", async () => {
    const fxRates = {
      "2024-12-31_EUR_CHF": new Prisma.Decimal(1.1),
      "2025-01-01_EUR_CHF": new Prisma.Decimal(1.2),
      "2025-01-02_EUR_CHF": new Prisma.Decimal(1.3),
      "2025-01-03_EUR_CHF": new Prisma.Decimal(1.2),
      "2025-01-04_EUR_CHF": new Prisma.Decimal(0.9),
    };

    async function getFxRate(
      date: Date,
      from: Unit,
      to: Unit,
    ): Promise<Prisma.Decimal> {
      if (from.unit !== "CURRENCY") throw new Error("Only currency supported");
      if (to.unit !== "CURRENCY") throw new Error("Only currency supported");

      if (from.currency === to.currency) {
        return new Prisma.Decimal(1);
      }

      const key = `${formatISODate(date)}_${from.currency}_${to.currency}`;
      if (!(key in fxRates)) throw new Error(`Unexpected FX rate: ${key}`);

      return fxRates[key as keyof typeof fxRates];
    }

    mockGetExchangeRate.mockImplementation((from: Unit, to: Unit, date: Date) =>
      getFxRate(date, from, to),
    );
    // ref currency opening balance
    const booking1 = buildBooking({
      date: new Date("2024-12-31"),
      value: new Prisma.Decimal(1000),
      currency: "CHF",
    });
    const booking2 = buildBooking({
      date: new Date("2024-12-31"),
      value: new Prisma.Decimal(-1000),
      currency: "CHF",
    });

    // FX opening balance
    const booking3 = buildBooking({
      date: new Date("2024-12-31"),
      value: new Prisma.Decimal(500),
      currency: "EUR",
    });
    const booking4 = buildBooking({
      date: new Date("2024-12-31"),
      value: new Prisma.Decimal(-500),
      currency: "EUR",
    });

    // ref currency expense
    const booking5 = buildBooking({
      date: new Date("2025-01-02"),
      value: new Prisma.Decimal(-20),
      currency: "CHF",
    });
    const booking6 = buildBooking({
      date: new Date("2025-01-02"),
      value: new Prisma.Decimal(20),
      currency: "CHF",
    });

    // FX transfer
    const booking7 = buildBooking({
      date: new Date("2025-01-03"),
      value: new Prisma.Decimal(-300),
      currency: "EUR",
    });
    const booking8 = buildBooking({
      date: new Date("2025-01-03"),
      value: new Prisma.Decimal(355),
      currency: "CHF",
    });

    const result = (
      await getIncomeData(
        [
          buildAccountWithBookings({
            id: "asset-account-1",
            type: AccountType.ASSET,
            currency: "CHF",
            bookings: [booking1, booking5, booking8],
          }),
          buildAccountWithBookings({
            id: "asset-account-2",
            type: AccountType.ASSET,
            currency: "EUR",
            bookings: [booking3, booking7],
          }),
          buildAccountWithBookings({
            id: "opening-balances-account",
            type: AccountType.EQUITY,
            bookings: [booking2, booking4],
          }),
          buildAccountWithBookings({
            id: "groceries-account",
            type: AccountType.EQUITY,
            bookings: [booking6],
          }),
        ],
        [buildAccountGroup({ id: "root-equity", type: AccountType.EQUITY })],
        [
          buildTransactionWithBookings({
            id: "transaction-1",
            bookings: [booking1, booking2],
          }),
          buildTransactionWithBookings({
            id: "transaction-2",
            bookings: [booking3, booking4],
          }),
          buildTransactionWithBookings({
            id: "transaction-3",
            bookings: [booking5, booking6],
          }),
          buildTransactionWithBookings({
            id: "transaction-4",
            bookings: [booking7, booking8],
          }),
        ],
        new Date("2025-01-04"),
      )
    ).valueByAccountId;

    expect(result).toEqual(
      new Map<string, Prisma.Decimal>([
        ["groceries-account", new Prisma.Decimal(-20)],
        ["fx-conversion", new Prisma.Decimal(-5)],
        ["fx-holding-asset-account-2", new Prisma.Decimal(-10)],
        ["opening-balances-account", new Prisma.Decimal(1550)],
      ]),
    );
  });
});
