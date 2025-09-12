import { Prisma, type Account, type Booking } from "@prisma/client";
import { addDays, differenceInDays, formatISO } from "date-fns";
import { refCurrency } from "~/config";
import { formatISODate } from "~/formatting";
import { sum } from "~/utils";

export function getBalanceByDate(
  account: AccountWithBookings,
): Map<string, Prisma.Decimal> {
  const bookingsByDate = account.bookings.reduce((acc, booking) => {
    const dateKey = formatISODate(booking.date);
    const bookings = acc.get(dateKey);
    if (bookings) {
      bookings.push(booking);
    } else {
      acc.set(dateKey, [booking]);
    }

    return acc;
  }, new Map<string, Booking[]>());

  const balanceByDate = new Map<string, Prisma.Decimal>();
  let balance = new Prisma.Decimal(0);

  for (const [dateKey, bookings] of bookingsByDate) {
    balance = balance.plus(sum(bookings.map((b) => b.value)));
    balanceByDate.set(dateKey, balance);
  }

  return balanceByDate;
}

export function generateFxBookingsForFxAccount(
  fxAccount: AccountWithBookings,
  getFxRate: (date: Date, from: string, to: string) => Prisma.Decimal,
  endDate: Date,
): Booking[] {
  if (fxAccount.bookings.length === 0) {
    return [];
  }

  const initialDate = fxAccount.bookings[0].date;

  const balanceByDate = getBalanceByDate(fxAccount);

  let balance = balanceByDate.get(formatISODate(initialDate));
  if (!balance) {
    throw new Error("Initial balance not found");
  }

  let fxRate = getFxRate(initialDate, fxAccount.currency!, refCurrency);

  const startDate = addDays(initialDate, 1);
  const numberOfDays = differenceInDays(endDate, startDate);
  const bookings = new Array(numberOfDays);
  let date = startDate;

  for (let i = 0; i <= numberOfDays; i++, date = addDays(date, 1)) {
    const newFxRate = getFxRate(date, fxAccount.currency!, refCurrency);
    const fxRateDiff = newFxRate.minus(fxRate);

    balance = balanceByDate.get(formatISODate(date)) ?? balance;

    bookings[i] = {
      id: `fx-booking-${fxAccount.id}-${formatISODate(date)}`,
      date,
      accountId: fxAccount.id,
      value: balance.mul(fxRateDiff),
      currency: refCurrency,
      createdAt: new Date(),
      updatedAt: new Date(),
      description: `FX P/L as of ${formatISO(date, { representation: "date" })}`,
      transactionId: "transaction-fx-profit-loss",
    };

    fxRate = newFxRate;
  }

  return bookings;
}

type AccountWithBookings = Account & {
  bookings: Booking[];
};
