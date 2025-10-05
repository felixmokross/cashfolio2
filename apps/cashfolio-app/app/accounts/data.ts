import { prisma } from "~/prisma.server";

export async function getAccounts(
  accountBookId: string,
  { isActive }: { isActive?: boolean } = {},
) {
  return await prisma.account.findMany({
    where: { accountBookId, isActive },
    orderBy: { name: "asc" },
  });
}
