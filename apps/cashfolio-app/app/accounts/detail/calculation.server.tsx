import { Prisma } from "@prisma/client";
import type { BookingWithTransaction, LedgerRow } from "./types";
import { getExchangeRate } from "~/fx.server";

export async function getLedgerRows(
  bookings: BookingWithTransaction[],
  ledgerCurrency: string,
) {
  const rows = new Array<LedgerRow>(bookings.length + 1);

  let balance = new Prisma.Decimal(0);

  for (let i = 0; i < bookings.length; i++) {
    const valueInAccountCurrency = (await getExchangeRate(
      bookings[i].currency,
      ledgerCurrency,
      bookings[i].date,
    ))!.mul(bookings[i].value);
    balance = balance.add(valueInAccountCurrency);
    rows[i] = {
      booking: bookings[i],
      valueInAccountCurrency,
      balance,
    };
  }

  return rows;
}
