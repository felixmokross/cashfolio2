import { redirect, useFetcher, type LoaderFunctionArgs } from "react-router";
import invariant from "tiny-invariant";
import { ensureAuthenticated } from "~/auth/functions.server";
import { CurrencyCombobox } from "~/components/currency-combobox";
import { AuthLayout } from "~/platform/auth-layout";
import { Button } from "~/platform/button";
import { Field, Label } from "~/platform/forms/fieldset";
import { Text } from "~/platform/text";
import { prisma } from "~/prisma.server";
import { defaultShouldRevalidate } from "~/revalidation";
import { getOrCreateUser } from "~/users/functions.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userContext = await ensureAuthenticated(request);
  invariant(userContext.claims, "No user claims");

  const user = await getOrCreateUser(userContext);
  const links = await prisma.userAccountBookLink.findMany({
    where: { userId: user.id },
  });

  if (links.length > 0) {
    return redirect(`/${links[0].accountBookId}/accounts`);
  }
}

export const shouldRevalidate = defaultShouldRevalidate;

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
