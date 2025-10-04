import { redirect, useFetcher, type LoaderFunctionArgs } from "react-router";
import { ensureAuthenticated } from "~/auth/functions.server";
import { CurrencyCombobox } from "~/components/currency-combobox";
import { AuthLayout } from "~/platform/auth-layout";
import { Button } from "~/platform/button";
import { Field, FieldGroup, Label } from "~/platform/forms/fieldset";
import { Text } from "~/platform/text";
import { prisma } from "~/prisma.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureAuthenticated(request);

  const accountBooks = await prisma.accountBook.findMany();
  if (accountBooks.length > 0) {
    return redirect(`/${accountBooks[0].id}/accounts`);
  }
}

export default function Route() {
  const fetcher = useFetcher();
  return (
    <AuthLayout>
      <div className="flex flex-col items-center gap-12">
        <Text>There are no account books yet.</Text>

        <fetcher.Form
          method="POST"
          action="/account-books/create"
          className="contents"
        >
          <Field>
            <Label>Reference Currency</Label>
            <CurrencyCombobox name="referenceCurrency" />
          </Field>
          <Button type="submit">Create Account Book</Button>
        </fetcher.Form>
      </div>
    </AuthLayout>
  );
}
