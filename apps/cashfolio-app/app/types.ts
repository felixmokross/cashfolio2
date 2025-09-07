import type { Account, Booking, Transaction } from "@prisma/client";

export type AccountOption = Pick<Account, "id" | "name">;

export type BookingWithAccountName = Booking & {
  account: { id: string; name: string };
};

export type TransactionWithBookings = Transaction & {
  bookings: BookingWithAccountName[];
};
