import { prisma } from "~/prisma.server";

export async function getTransactionsWithBookings(endDate: Date) {
  return await prisma.transaction.findMany({
    include: {
      bookings: { orderBy: { date: "asc" }, where: { date: { lte: endDate } } },
    },
  });
}
