import type { AccountType } from "~/.prisma-client/client";
import { data, type ActionFunctionArgs } from "react-router";
import { prisma } from "~/prisma.server";
import { getFormValues, hasErrors, validate } from "./shared";
import { ensureAuthenticated } from "~/auth/functions.server";
import invariant from "tiny-invariant";

export async function action({ request, params }: ActionFunctionArgs) {
  await ensureAuthenticated(request);
  invariant(params.accountBookId, "accountBookId not found");

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
      accountBookId: params.accountBookId,
    },
  });

  return { success: true };
}
