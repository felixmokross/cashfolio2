import { describe, expect, test } from "vitest";
import { generateFxBookingsForFxAccount, getBalanceByDate } from "./model";
import { buildAccount, buildBooking } from "./builders";
import { Prisma } from "@prisma/client";
import { formatISODate } from "~/formatting";

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
  test("returns FX bookings for an FX account", () => {
    const fxRates = {
      "2024-12-31_EUR_CHF": new Prisma.Decimal(1.1),
      "2025-01-01_EUR_CHF": new Prisma.Decimal(1.2),
      "2025-01-02_EUR_CHF": new Prisma.Decimal(1.3),
      "2025-01-03_EUR_CHF": new Prisma.Decimal(1.2),
      "2025-01-04_EUR_CHF": new Prisma.Decimal(0.95),
    };

    function getFxRate(date: Date, from: string, to: string): Prisma.Decimal {
      const key = `${formatISODate(date)}_${from}_${to}`;
      if (!(key in fxRates)) throw new Error(`Unexpected FX rate: ${key}`);

      return fxRates[key as keyof typeof fxRates];
    }

    const result = generateFxBookingsForFxAccount(
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
      getFxRate,
      new Date("2025-01-04"),
    );

    expect(result).toEqual([
      expect.objectContaining({
        date: new Date("2025-01-01"),
        value: new Prisma.Decimal(100),
      }),
      expect.objectContaining({
        date: new Date("2025-01-02"),
        value: new Prisma.Decimal(100),
      }),
      expect.objectContaining({
        date: new Date("2025-01-03"),
        value: new Prisma.Decimal(-90),
      }),
      expect.objectContaining({
        date: new Date("2025-01-04"),
        value: new Prisma.Decimal(-225),
      }),
    ]);
  });

  test("returns an empty array if there is no booking", () => {
    const result = generateFxBookingsForFxAccount(
      {
        ...buildAccount({ id: "fx-account", currency: "EUR" }),
        bookings: [],
      },
      () => new Prisma.Decimal(1),
      new Date("2025-01-04"),
    );

    expect(result).toEqual([]);
  });
});
