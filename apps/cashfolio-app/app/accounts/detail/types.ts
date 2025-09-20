import type { Booking, Prisma } from "@prisma/client";
import type { TransactionWithBookings } from "~/transactions/types";

export type BookingWithTransaction = Booking & {
  transaction: TransactionWithBookings;
};

export type LedgerRow = {
  booking: BookingWithTransaction;
  valueInLedgerCurrency: Prisma.Decimal;
  balance: Prisma.Decimal;
};

export type Period = {
  fromDate?: Date;
  toDate?: Date;
};
