import { prisma } from "~/prisma.server";

export async function getMinBookingDate(accountBookId: string) {
  const {
    _min: { date: minBookingDate },
  } = await prisma.booking.aggregate({
    _min: { date: true },
    where: { accountBookId: accountBookId },
  });
  if (!minBookingDate) {
    throw new Error("No bookings found");
  }

  return minBookingDate;
}

export async function getMinBookingDateForAccount(
  accountBookId: string,
  accountId: string,
) {
  const {
    _min: { date: minBookingDate },
  } = await prisma.booking.aggregate({
    _min: { date: true },
    where: { accountBookId, accountId },
  });
  if (!minBookingDate) {
    throw new Error("No bookings found");
  }

  return minBookingDate;
}
