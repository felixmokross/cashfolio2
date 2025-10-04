import type { Account, Booking } from "~/.prisma-client/client";

export type AccountWithBookings = Account & {
  bookings: Booking[];
};
