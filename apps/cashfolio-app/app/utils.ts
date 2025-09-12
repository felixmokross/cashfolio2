import { Prisma, type AccountGroup } from "@prisma/client";

export function getAccountGroupPath(
  accountGroupId: string,
  accountGroups: Pick<AccountGroup, "id" | "parentGroupId" | "name">[],
): string {
  const accountGroup = accountGroups.find((g) => g.id === accountGroupId);
  if (!accountGroup) return `Unknown group ${accountGroupId}`;
  const prefix = accountGroup.parentGroupId
    ? `${getAccountGroupPath(accountGroup.parentGroupId, accountGroups)} / `
    : "";
  return prefix + accountGroup.name;
}

export function sum(values: Prisma.Decimal[]): Prisma.Decimal {
  return values.reduce((prev, curr) => prev.plus(curr), new Prisma.Decimal(0));
}
