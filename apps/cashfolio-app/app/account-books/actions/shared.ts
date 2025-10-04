export async function getFormValues(request: Request): Promise<FormValues> {
  const form = await request.formData();
  return {
    id: form.get("id")?.toString(),
    name: form.get("name")?.toString(),
    referenceCurrency: form.get("referenceCurrency")?.toString() || "",
  };
}

export type FormValues = {
  id?: string;
  name?: string;
  referenceCurrency: string;
};

export type FormErrors = { form?: string } & Partial<
  Record<keyof FormValues, string>
>;

export function hasErrors(errors: FormErrors) {
  return Object.keys(errors).length > 0;
}

export function validate(values: FormValues) {
  const errors: FormErrors = {};

  if (!values.referenceCurrency) {
    errors.referenceCurrency = "This field is required";
  }

  if (values.id) {
    if (!values.name) {
      errors.name = "This field is required";
    }
  }

  return errors;
}
