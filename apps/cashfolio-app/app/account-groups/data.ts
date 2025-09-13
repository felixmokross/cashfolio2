import { prisma } from "~/prisma.server";

export async function getAccountGroups() {
  return await prisma.accountGroup.findMany({ orderBy: { name: "asc" } });
}
