import { Prisma, Unit } from "@prisma/client";
import type { BookingWithTransaction, LedgerRow } from "./types";
import { convert } from "~/fx.server";

export async function getLedgerRows(
  bookings: BookingWithTransaction[],
  ledgerCurrency: string,
) {
  const rows = new Array<LedgerRow>(bookings.length + 1);

  let balance = new Prisma.Decimal(0);

  for (let i = 0; i < bookings.length; i++) {
    const valueInAccountCurrency =
      bookings[i].unit === Unit.CURRENCY
        ? await convert(
            bookings[i].value,
            bookings[i].currency!,
            ledgerCurrency,
            bookings[i].date,
          )
        : // TODO: handle crypto properly
          new Prisma.Decimal(0);
    balance = balance.add(valueInAccountCurrency);
    rows[i] = {
      booking: bookings[i],
      valueInAccountCurrency,
      balance,
    };
  }

  return rows;
}
