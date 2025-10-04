import { prisma } from "~/prisma.server";

export async function getAccounts(accountBookId: string) {
  return await prisma.account.findMany({
    where: { accountBookId },
    orderBy: { name: "asc" },
  });
}
