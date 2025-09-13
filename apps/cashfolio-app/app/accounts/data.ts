import { prisma } from "~/prisma.server";

export async function getAccounts() {
  return await prisma.account.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getAccountsWithBookings(endDate: Date) {
  return await prisma.account.findMany({
    orderBy: { name: "asc" },
    include: {
      bookings: { orderBy: { date: "asc" }, where: { date: { lte: endDate } } },
    },
  });
}
