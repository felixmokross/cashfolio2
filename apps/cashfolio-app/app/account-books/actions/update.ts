import { data, type ActionFunctionArgs } from "react-router";
import { ensureAuthenticated } from "~/auth/functions.server";
import { getFormValues, hasErrors, validate } from "./shared";
import { prisma } from "~/prisma.server";

export async function action({ request }: ActionFunctionArgs) {
  await ensureAuthenticated(request);

  const values = await getFormValues(request);
  const errors = validate(values);
  if (hasErrors(errors)) {
    return data({ success: false, errors }, { status: 400 });
  }

  await prisma.accountBook.update({
    where: { id: values.id! },
    data: {
      name: values.name,
      referenceCurrency: values.referenceCurrency,
    },
  });

  return { success: true };
}
