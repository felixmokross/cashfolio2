import { data, type ActionFunctionArgs } from "react-router";
import slugify from "slugify";
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

  await prisma.accountGroup.update({
    where: {
      id_accountBookId: { id: values.id!, accountBookId: params.accountBookId },
    },
    data: {
      name: values.name,
      slug: slugify(values.name, { lower: true }),
      parentGroupId: values.parentGroupId || null,
    },
  });

  return { success: true };
}
