import { prisma } from "~/prisma.server";
import { getAccountGroupPath } from "~/utils";

export async function getAccountGroups(accountBookId: string) {
  return await prisma.accountGroup.findMany({
    where: { accountBookId },
    orderBy: { name: "asc" },
  });
}

export async function getAccountGroupsWithPath(accountBookId: string) {
  const accountGroups = await getAccountGroups(accountBookId);
  return accountGroups.map((ag) => ({
    ...ag,
    path: getAccountGroupPath(ag.id, accountGroups),
  }));
}
