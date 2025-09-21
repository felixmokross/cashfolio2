import type { AccountType } from "@prisma/client";
import { data, redirect } from "react-router";
import slugify from "slugify";
import { prisma } from "~/prisma.server";
import { getFormValues, hasErrors, validate } from "./shared";

export async function action({ request }: { request: Request }) {
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
