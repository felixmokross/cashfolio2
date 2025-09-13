import type { Booking, Transaction } from "@prisma/client";

export type TransactionWithBookings = Transaction & {
  bookings: Booking[];
};
