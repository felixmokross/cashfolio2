import { prisma } from "~/prisma.server";

export async function getAccounts(accountBookId: string) {
  return await prisma.account.findMany({
    where: { accountBookId },
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
