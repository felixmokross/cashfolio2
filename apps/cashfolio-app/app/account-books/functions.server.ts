import { prisma } from "~/prisma.server";

export async function getFirstBookingDate(accountBookId: string) {
  return (
    await prisma.booking.findFirst({
      where: { accountBookId },
      orderBy: { date: "asc" },
    })
  )?.date;
}
