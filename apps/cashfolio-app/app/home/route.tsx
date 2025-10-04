import { redirect, useFetcher, type LoaderFunctionArgs } from "react-router";
import invariant from "tiny-invariant";
import { ensureAuthenticated } from "~/auth/functions.server";
import { CurrencyCombobox } from "~/components/currency-combobox";
import { AuthLayout } from "~/platform/auth-layout";
import { Button } from "~/platform/button";
import { Field, Label } from "~/platform/forms/fieldset";
import { Text } from "~/platform/text";
import { prisma } from "~/prisma.server";
import { getOrCreateUser } from "~/users/data";

export async function loader({ request }: LoaderFunctionArgs) {
  const userContext = await ensureAuthenticated(request);
  invariant(userContext.claims, "No user claims");

  const user = await getOrCreateUser(userContext);
  const userWithAccountBookLinks = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    include: { accountBookLinks: true },
  });

  if (userWithAccountBookLinks.accountBookLinks.length > 0) {
    return redirect(
      `/${userWithAccountBookLinks.accountBookLinks[0].accountBookId}/accounts`,
    );
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
