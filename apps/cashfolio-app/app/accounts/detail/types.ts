import type { Booking, Prisma } from "@prisma/client";
import type { TransactionWithBookings } from "~/transactions/types";

export type BookingWithTransaction = Booking & {
  transaction: TransactionWithBookings;
};

export type LedgerRow = {
  booking: BookingWithTransaction;
  valueInAccountCurrency: Prisma.Decimal;
  balance: Prisma.Decimal;
};
