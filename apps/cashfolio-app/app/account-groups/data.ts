import { prisma } from "~/prisma.server";

export async function getAccountGroups(accountBookId: string) {
  return await prisma.accountGroup.findMany({
    where: { accountBookId },
    orderBy: { name: "asc" },
  });
}
