import { Prisma, Unit } from "@prisma/client";
import type { BookingWithTransaction, LedgerRow } from "./types";
import { convert } from "~/fx.server";

export async function getLedgerRows(
  bookings: BookingWithTransaction[],
  ledgerCurrency: string, // TODO this should be of type Unit
) {
  const rows = new Array<LedgerRow>(bookings.length + 1);

  let balance = new Prisma.Decimal(0);

  for (let i = 0; i < bookings.length; i++) {
    const valueInAccountCurrency = await convert(
      bookings[i].value,
      bookings[i].unit === Unit.CURRENCY
        ? { unit: Unit.CURRENCY, currency: bookings[i].currency! }
        : {
            unit: Unit.CRYPTOCURRENCY,
            cryptocurrency: bookings[i].cryptocurrency!,
          },
      { unit: Unit.CURRENCY, currency: ledgerCurrency },
      bookings[i].date,
    );
    balance = balance.add(valueInAccountCurrency);
    rows[i] = {
      booking: bookings[i],
      valueInAccountCurrency,
      balance,
    };
  }

  return rows;
}
