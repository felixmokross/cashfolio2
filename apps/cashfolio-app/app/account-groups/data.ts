import { prisma } from "~/prisma.server";
import { getAccountGroupPath } from "~/utils";

type GetAccountGroupsOptions = { isActive?: boolean };

export async function getAccountGroups(
  accountBookId: string,
  { isActive }: GetAccountGroupsOptions = {},
) {
  return await prisma.accountGroup.findMany({
    where: { accountBookId, isActive },
    orderBy: { name: "asc" },
  });
}

export async function getAccountGroupsWithPath(
  accountBookId: string,
  options: GetAccountGroupsOptions = {},
) {
  const accountGroups = await getAccountGroups(accountBookId, options);
  return accountGroups.map((ag) => ({
    ...ag,
    path: getAccountGroupPath(ag.id, accountGroups),
  }));
}
