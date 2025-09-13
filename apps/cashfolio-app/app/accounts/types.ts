import type { Account, Booking } from "@prisma/client";

export type AccountWithBookings = Account & {
  bookings: Booking[];
};
