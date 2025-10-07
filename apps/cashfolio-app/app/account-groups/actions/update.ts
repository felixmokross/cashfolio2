import { data, type ActionFunctionArgs } from "react-router";
import { prisma } from "~/prisma.server";
import { getFormValues, hasErrors, validate } from "./shared";
import { ensureAuthorized } from "~/account-books/functions.server";

export async function action({ request, params }: ActionFunctionArgs) {
  const link = await ensureAuthorized(request, params);

  const values = await getFormValues(request);

  const errors = validate(values);
  if (hasErrors(errors)) {
    return data({ success: false, errors }, { status: 400 });
  }

  await prisma.accountGroup.update({
    where: {
      id_accountBookId: { id: values.id!, accountBookId: link.accountBookId },
    },
    data: {
      name: values.name,
      parentGroupId: values.parentGroupId || null,
      isActive: values.isActive,
      sortOrder: values.sortOrder,
    },
  });

  if (values.id && !values.isActive) {
    await deactiveChildNodes(link.accountBookId, values.id);
  }

  return { success: true };
}

async function deactiveChildNodes(
  accountBookId: string,
  accountGroupId: string,
) {
  const childAccounts = await prisma.account.findMany({
    where: { groupId: accountGroupId, isActive: true },
  });

  for (const childAccount of childAccounts) {
    await prisma.account.update({
      where: {
        id_accountBookId: { id: childAccount.id, accountBookId: accountBookId },
      },
      data: { isActive: false },
    });
  }

  const childGroups = await prisma.accountGroup.findMany({
    where: { parentGroupId: accountGroupId, isActive: true },
  });

  for (const childGroup of childGroups) {
    await prisma.accountGroup.update({
      where: {
        id_accountBookId: { id: childGroup.id, accountBookId: accountBookId },
      },
      data: { isActive: false },
    });
    await deactiveChildNodes(accountBookId, childGroup.id);
  }
}
