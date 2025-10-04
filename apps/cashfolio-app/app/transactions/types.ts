import type { Booking, Transaction } from "~/.prisma-client/client";

export type TransactionWithBookings = Transaction & {
  bookings: Booking[];
};
