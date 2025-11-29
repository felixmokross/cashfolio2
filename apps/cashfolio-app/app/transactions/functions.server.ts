import { today } from "~/dates";
import { prisma } from "~/prisma.server";

export async function getMinBookingDate(accountBookId: string) {
  const {
    _min: { date: minBookingDate },
  } = await prisma.booking.aggregate({
    _min: { date: true },
    where: { accountBookId: accountBookId },
  });

  return minBookingDate ?? today();
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

  return minBookingDate ?? (await getMinBookingDate(accountBookId));
}
