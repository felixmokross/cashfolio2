import { AccountType } from "~/.prisma-client/enums";

export async function getFormValues(request: Request): Promise<FormValues> {
  const form = await request.formData();
  return {
    id: form.get("id")?.toString(),
    name: form.get("name")?.toString() ?? "",
    type: form.get("type")?.toString() ?? "",
    parentGroupId: form.get("parentGroupId")?.toString(),
  };
}

export function validate(values: FormValues) {
  const errors: FormErrors = {};

  if (!values.name) {
    errors.name = "Name is required";
  }

  if (!values.id) {
    if (!values.type) {
      errors.type = "Type is required";
    } else if (
      !Object.values(AccountType).includes(values.type as AccountType)
    ) {
      errors.type = "Invalid type";
    }
  }

  return errors;
}

export type FormValues = {
  id?: string;
  name: string;
  type?: string;
  parentGroupId?: string;
};

export type FormErrors = { form?: string } & Partial<
  Record<keyof FormValues, string>
>;

export function hasErrors(errors: FormErrors) {
  return Object.keys(errors).length > 0;
}
