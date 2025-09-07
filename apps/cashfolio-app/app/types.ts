import type { Account, Booking, Transaction } from "@prisma/client";

export type AccountOption = Pick<Account, "id" | "name">;

export type TransactionWithBookings = Transaction & {
  bookings: Booking[];
};
