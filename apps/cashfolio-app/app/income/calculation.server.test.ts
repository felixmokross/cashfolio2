import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  generateHoldingBookingsForAccount,
  getIncomeData,
} from "./calculation.server";
import { buildBooking } from "../transactions/builders";
import { formatISODate } from "~/formatting";
import { getExchangeRate } from "~/fx.server";
import { Decimal } from "@prisma/client/runtime/library";
import { AccountType } from "~/.prisma-client/enums";
import { buildAccount, buildAccountWithBookings } from "~/accounts/builders";
import { buildAccountGroup } from "~/account-groups/builders";
import type { UnitInfo } from "~/units/types";

const mockGetExchangeRate = vi.fn();

vi.mock("~/fx.server", async () => ({
  convert,
  getExchangeRate: (...args: Parameters<typeof mockGetExchangeRate>) =>
    mockGetExchangeRate(...args),
}));

vi.mock("~/prisma.server", () => ({
  prisma: {},
}));

vi.mock("~/redis.server", async () => ({
  redis: {},
}));

// needs to be redefined, because the real function will not use the mocked 'getExchangeRate' since it is in the same module
async function convert(
  value: Decimal,
  sourceUnitInfo: UnitInfo,
  targetUnitInfo: UnitInfo,
  date: Date,
) {
  return (await getExchangeRate(sourceUnitInfo, targetUnitInfo, date)).mul(
    value,
  );
}

beforeEach(() => {
  mockGetExchangeRate.mockReset();
});

describe.skip("generateFxBookingsForFxAccount", () => {
  test("returns FX bookings for an FX account", async () => {
    const fxRates = {
      "2024-12-31_EUR_CHF": new Decimal(1.1),
      "2025-01-01_EUR_CHF": new Decimal(1.2),
      "2025-01-02_EUR_CHF": new Decimal(1.3),
      "2025-01-03_EUR_CHF": new Decimal(1.2),
      "2025-01-04_EUR_CHF": new Decimal(0.95),
    };

    async function getFxRate(
      date: Date,
      from: UnitInfo,
      to: UnitInfo,
    ): Promise<Decimal> {
      if (from.unit !== "CURRENCY") throw new Error("Only currency supported");
      if (to.unit !== "CURRENCY") throw new Error("Only currency supported");

      const key = `${formatISODate(date)}_${from.currency}_${to.currency}`;
      if (!(key in fxRates)) throw new Error(`Unexpected FX rate: ${key}`);

      return fxRates[key as keyof typeof fxRates];
    }

    mockGetExchangeRate.mockImplementation(
      (from: UnitInfo, to: UnitInfo, date: Date) => getFxRate(date, from, to),
    );

    const result = await generateHoldingBookingsForAccount(
      {
        id: "book-1",
        name: "Account Book",
        referenceCurrency: "CHF",
        securityHoldingGainLossAccountGroupId: null,
        cryptoHoldingGainLossAccountGroupId: null,
        fxHoldingGainLossAccountGroupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        ...buildAccount({ id: "fx-account", currency: "EUR" }),
        bookings: [
          buildBooking({
            date: new Date("2024-12-31"),
            value: new Decimal(1000),
          }),

          buildBooking({
            date: new Date("2025-01-03"),
            value: new Decimal(-100),
          }),
        ],
      },
      new Date("2025-01-01"),
      new Date("2025-01-04"),
    );

    expect(result).toEqual([
      expect.objectContaining({
        date: new Date("2025-01-01"),
        value: new Decimal(-100),
      }),
      expect.objectContaining({
        date: new Date("2025-01-02"),
        value: new Decimal(-100),
      }),
      expect.objectContaining({
        date: new Date("2025-01-03"),
        value: new Decimal(100),
      }),
      expect.objectContaining({
        date: new Date("2025-01-04"),
        value: new Decimal(225),
      }),
    ]);
  });

  test("returns an empty array if there is no booking", async () => {
    const result = await generateHoldingBookingsForAccount(
      {
        id: "book-1",
        name: "Account Book",
        referenceCurrency: "CHF",
        securityHoldingGainLossAccountGroupId: null,
        cryptoHoldingGainLossAccountGroupId: null,
        fxHoldingGainLossAccountGroupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        ...buildAccount({ id: "fx-account", currency: "EUR" }),
        bookings: [],
      },
      new Date("2025-01-01"),
      new Date("2025-01-04"),
    );

    expect(result).toEqual([]);
  });
});

describe.skip("getProfitLossStatement", () => {
  test("generates the profit/loss statement", async () => {
    const fxRates = {
      "2024-12-31_EUR_CHF": new Decimal(1.1),
      "2025-01-01_EUR_CHF": new Decimal(1.2),
      "2025-01-02_EUR_CHF": new Decimal(1.3),
      "2025-01-03_EUR_CHF": new Decimal(1.2),
      "2025-01-04_EUR_CHF": new Decimal(0.9),
    };

    async function getFxRate(
      date: Date,
      from: UnitInfo,
      to: UnitInfo,
    ): Promise<Decimal> {
      if (from.unit !== "CURRENCY") throw new Error("Only currency supported");
      if (to.unit !== "CURRENCY") throw new Error("Only currency supported");

      if (from.currency === to.currency) {
        return new Decimal(1);
      }

      const key = `${formatISODate(date)}_${from.currency}_${to.currency}`;
      if (!(key in fxRates)) throw new Error(`Unexpected FX rate: ${key}`);

      return fxRates[key as keyof typeof fxRates];
    }

    mockGetExchangeRate.mockImplementation(
      (from: UnitInfo, to: UnitInfo, date: Date) => getFxRate(date, from, to),
    );
    // ref currency opening balance
    const booking1 = buildBooking({
      date: new Date("2024-12-31"),
      value: new Decimal(1000),
      currency: "CHF",
    });
    const booking2 = buildBooking({
      date: new Date("2024-12-31"),
      value: new Decimal(-1000),
      currency: "CHF",
    });

    // FX opening balance
    const booking3 = buildBooking({
      date: new Date("2024-12-31"),
      value: new Decimal(500),
      currency: "EUR",
    });
    const booking4 = buildBooking({
      date: new Date("2024-12-31"),
      value: new Decimal(-500),
      currency: "EUR",
    });

    // ref currency expense
    const booking5 = buildBooking({
      date: new Date("2025-01-02"),
      value: new Decimal(-20),
      currency: "CHF",
    });
    const booking6 = buildBooking({
      date: new Date("2025-01-02"),
      value: new Decimal(20),
      currency: "CHF",
    });

    // FX transfer
    const booking7 = buildBooking({
      date: new Date("2025-01-03"),
      value: new Decimal(-300),
      currency: "EUR",
    });
    const booking8 = buildBooking({
      date: new Date("2025-01-03"),
      value: new Decimal(355),
      currency: "CHF",
    });

    const result = (
      await getIncomeData(
        {
          id: "book-1",
          name: "Account Book",
          referenceCurrency: "CHF",
          securityHoldingGainLossAccountGroupId: null,
          cryptoHoldingGainLossAccountGroupId: null,
          fxHoldingGainLossAccountGroupId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
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
        new Date("2025-01-01"),
        new Date("2025-01-04"),
      )
    ).valueByAccountId;

    expect(result).toEqual(
      new Map<string, Decimal>([
        ["groceries-account", new Decimal(-20)],
        ["fx-conversion", new Decimal(-5)],
        ["fx-holding-asset-account-2", new Decimal(-10)],
        ["opening-balances-account", new Decimal(1550)],
      ]),
    );
  });
});
