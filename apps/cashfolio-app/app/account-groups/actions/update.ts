import { data } from "react-router";
import slugify from "slugify";
import { prisma } from "~/prisma.server";
import { getFormValues, hasErrors, validate } from "./shared";

export async function action({ request }: { request: Request }) {
  const values = await getFormValues(request);

  const errors = validate(values);
  if (hasErrors(errors)) {
    return data({ success: false, errors }, { status: 400 });
  }

  await prisma.accountGroup.update({
    where: { id: values.id },
    data: {
      name: values.name,
      slug: slugify(values.name, { lower: true }),
      parentGroupId: values.parentGroupId || null,
    },
  });

  return { success: true };
}
