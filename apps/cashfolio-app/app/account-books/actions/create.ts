import { data, type ActionFunctionArgs } from "react-router";
import { ensureAuthenticated } from "~/auth/functions.server";
import { prisma } from "~/prisma.server";

export async function action({ request }: ActionFunctionArgs) {
  await ensureAuthenticated(request);

  const values = await getFormValues(request);
  const errors = validate(values);
  if (hasErrors(errors)) {
    return data({ success: false, errors }, { status: 400 });
  }

  await prisma.accountBook.create({
    data: {
      name: "New Account Book",
    },
  });

  return { success: true };
}

async function getFormValues(request: Request): Promise<FormValues> {
  const form = await request.formData();
  return {};
}

type FormValues = {};

type FormErrors = { form?: string } & Partial<Record<keyof FormValues, string>>;

function hasErrors(errors: FormErrors) {
  return Object.keys(errors).length > 0;
}

function validate(values: FormValues) {
  const errors: FormErrors = {};

  return errors;
}
