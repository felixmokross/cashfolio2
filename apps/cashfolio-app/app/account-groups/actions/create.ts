import type { AccountType } from "~/.prisma-client/client";
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

  await prisma.accountGroup.create({
    data: {
      name: values.name,
      type: values.type as AccountType,
      parentGroupId: values.parentGroupId || null,
      accountBookId: link.accountBookId,
      isActive: values.isActive,
      sortOrder: values.sortOrder ?? null,
    },
  });

  return { success: true };
}
