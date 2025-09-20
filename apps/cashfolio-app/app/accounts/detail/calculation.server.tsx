import { Prisma, Unit, type Booking } from "@prisma/client";
import type { BookingWithTransaction, LedgerRow } from "./types";
import { convert } from "~/fx.server";

export async function getBalance(bookings: Booking[], ledgerCurrency: string) {
  let balance = new Prisma.Decimal(0);
  for (let i = 0; i < bookings.length; i++) {
    balance = balance.add(
      await getBookingValueInLedgerCurrency(bookings[i], ledgerCurrency),
    );
  }
  return balance;
}

export async function getLedgerRows(
  bookings: BookingWithTransaction[],
  ledgerCurrency: string, // TODO this should be of type Unit
  openingBalance?: Prisma.Decimal,
) {
  const rows = new Array<LedgerRow>(bookings.length + 1);

  let balance = openingBalance ?? new Prisma.Decimal(0);

  for (let i = 0; i < bookings.length; i++) {
    const valueInLedgerCurrency = await getBookingValueInLedgerCurrency(
      bookings[i],
      ledgerCurrency,
    );
    balance = balance.add(valueInLedgerCurrency);
    rows[i] = {
      booking: bookings[i],
      valueInLedgerCurrency,
      balance,
    };
  }

  return rows;
}

async function getBookingValueInLedgerCurrency(
  booking: Booking,
  ledgerCurrency: string,
) {
  return await convert(
    booking.value,
    booking.unit === Unit.CURRENCY
      ? { unit: Unit.CURRENCY, currency: booking.currency! }
      : booking.unit === Unit.CRYPTOCURRENCY
        ? {
            unit: Unit.CRYPTOCURRENCY,
            cryptocurrency: booking.cryptocurrency!,
          }
        : {
            unit: Unit.SECURITY,
            symbol: booking.symbol!,
            tradeCurrency: booking.tradeCurrency!,
          },
    { unit: Unit.CURRENCY, currency: ledgerCurrency },
    booking.date,
  );
}
