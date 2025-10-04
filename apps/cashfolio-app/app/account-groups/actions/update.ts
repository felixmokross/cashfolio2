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
    },
  });

  return { success: true };
}
