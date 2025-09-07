import type { Account, Booking, Transaction } from "@prisma/client";

export type AccountOption = Pick<Account, "id" | "name" | "groupId"> & {
  path: string;
};

export type TransactionWithBookings = Transaction & {
  bookings: Booking[];
};
