import type { AccountType } from "~/.prisma-client/client";
import { data } from "react-router";
import slugify from "slugify";
import { prisma } from "~/prisma.server";
import { getFormValues, hasErrors, validate } from "./shared";
import { ensureAuthenticated } from "~/auth/functions.server";

export async function action({ request }: { request: Request }) {
  await ensureAuthenticated(request);

  const values = await getFormValues(request);
  const errors = validate(values);
  if (hasErrors(errors)) {
    return data({ success: false, errors }, { status: 400 });
  }

  await prisma.accountGroup.create({
    data: {
      name: values.name,
      slug: slugify(values.name, { lower: true }),
      type: values.type as AccountType,
      parentGroupId: values.parentGroupId || null,
    },
  });

  return { success: true };
}
